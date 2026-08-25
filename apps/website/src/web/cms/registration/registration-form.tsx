
/**
 |
 | The form is UNCONTROLLED — no field value is React state, so typing
 | re-renders nothing on account of the typing. Values are mirrored into refs on
 | the provider by the delegated handlers below, and read back out through
 | `defaultValue` / `defaultChecked` when the breakpoint swap remounts this
 | component inside the other container.
 |
 | Two delegated listeners on the `<form>`, not two per field, and they stay two
 | however many fields this grows:
 |
 |   `on_change`  mirrors values and re-reads the form's verdict. CONTINUOUS,
 |                because losing what someone typed is the expensive failure. It
 |                also means an unmount nobody anticipated cannot cost anything.
 |                React's `onChange` is the `input` event on a text field and
 |                the `change` event on a checkbox or a `<select>` — one
 |                listener where the platform has two names for the same idea.
 |   `on_focus`   records which field holds focus. `onFocus` is `focusin` under
 |                React, so it delegates like the rest.
 |
 | The CARET is read once, in the unmount cleanup below, off the field
 | `on_focus` last named. Listening for it live would mean `keyup` and `click`
 | handlers as well — arrow keys and click-to-position move the caret without
 | producing an `input` event — and that is three extra listeners to place a
 | text cursor.
 |
 | A cleanup is safe HERE specifically because it looks the field up by name on
 | a closed-over `<form>` node. What is not safe, and what this deliberately
 | avoids, is reading `document.activeElement` at cleanup time: Base UI moves
 | focus out during the deletion commit, and `blur` is not reliably dispatched
 | when a focused element is removed from the document. Should the cleanup ever
 | miss, the cost is a caret in the wrong place, not lost text.
 |
 | ─── WHEN A MESSAGE IS ALLOWED TO APPEAR ────────────────────────────────────
 |
 | Not until Submit has been pressed. Filling in a form top to bottom means
 | passing through an invalid state in every single field on the way — an empty
 | field IS an incomplete required field — and a form that objects to each one
 | as you arrive at it is arguing with work in progress.
 |
 | From the first failed attempt onwards it goes LIVE, per field: fix a field
 | and its message goes the moment the value turns valid; break one again and it
 | comes straight back. The visitor has asked to be told by then, and telling
 | them at the keystroke that fixes it is the fastest possible answer.
 |
 | That is one flag — `attempted_ref`, kept in the draft so the breakpoint swap
 | cannot reset the argument — and one derived line at the bottom of this file.
 |
 | ─── WHAT DOES HOLD STATE, and why it is only this much ─────────────────────
 |
 | The messages, whether they are being shown, whether a submission is in
 | flight, and whether the last one failed. The messages are recomputed on every
 | change and written back only when they DIFFER, so a keystroke that changes
 | nothing about the form's verdict re-renders nothing. The submit button's
 | colour is read off the same object (empty means ready), so there is no third
 | piece of state to keep in step with the other two — and note it is read off
 | `messages`, not off what is shown, which is why the button greys from the
 | very first render while the field messages stay quiet.
 |
 | The messages do not need to survive the breakpoint swap: one pass over the
 | `<form>` on mount rebuilds them exactly.
 |
 | ─── THE SUBMIT BUTTON IS NEVER DISABLED, only greyed ───────────────────────
 |
 | A disabled button cannot be focused, cannot be clicked, and therefore cannot
 | explain itself — the visitor is left to guess which of nine fields is holding
 | things up. Greyed, it still takes the press, and the press is what reveals
 | every outstanding message, moves focus to the first of them, and announces
 | how many there are.
 |
 | ─── WHAT THE STATIC SITE DID NOT HAVE: THE SUBMISSION ──────────────────────
 |
 | The payload goes to `POST /registration`, which relays it to the CMS. Two
 | things travel with it that no field produced: the **form token**, minted when
 | the overlay opened, and the **honeypot** — a field with a plausible name,
 | rotated daily, that a person never sees and a script that fills every input
 | fills.
 |
 | The values are read off the `<form>` rather than out of the draft's mirror.
 | The mirror is a restoration aid — it holds what the delegated handler last
 | saw, which is a frame behind and misses anything a browser filled in without
 | dispatching an event. The elements are the answers.
 |
 */

import type {
	FocusEvent,
	FormEvent,
} from "react"
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react"

import type { Form_Token } from "./use-form-token.ts"

import {
	Consent_Field,
	Floating_Label_Field,
	Interests_Field,
	Occupation_Field,
} from "./registration-fields.tsx"
import { use_registration_actions } from "./registration-context.ts"
import {
	ACCURACY_DECLARATION,
	checkbox_key,
	collect_messages,
	FIELD_ORDER,
	INTERESTS,
	messages_match,
	OCCUPATION,
	PRIVACY_CONSENT,
	TEXT_FIELDS,
} from "./submission.ts"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

// Shared, and never written to. `Object.keys( … ).length === 0` is the form
// being ready; there is no separate `is_valid` to fall out of step.
const NO_MESSAGES: Record<string, string> = {}

// `selectionStart` throws InvalidStateError on input types with no selection
// model — `email` and `number` among them. Only these carry one.
const SELECTABLE_TYPES = new Set( [
	"text",
	"search",
	"url",
	"tel",
	"password",
] )

const ROW_PAIR_CLASS = "grid grid-cols-2 gap-x-4"

const SUBMIT_READY_CLASS = "bg-theme text-gray-light"
const SUBMIT_WAITING_CLASS = "bg-black/35 text-white"

const SUBMIT_PATH = "/registration"

/**
 |
 | What a refused submission says. One sentence, because the server tells the
 | browser nothing more than that — the reason is in the server's log, and
 | telling a caller which of four checks they failed is telling them what to
 | change.
 |
 */
const COULD_NOT_SEND =
	"We could not send your registration. Please try again in a moment."

export function Registration_Form (
	{ className = "", form_token, take_token }: {
		className?: string
		/** Minted when the overlay opened. Null while the mint is in flight. */
		form_token: Form_Token | null
		/**
		 |
		 | Hand over a token to send, and treat it as spent. Mints a fresh one
		 | when the held one has already been handed out — see `use-form-token.ts`.
		 |
		 */
		take_token: () => Promise<Form_Token | null>
	},
) {
	const { confirm, draft } = use_registration_actions()
	const { attempted_ref, checked_ref, focus_ref, form_ref, values_ref } =
		draft

	const [ messages, set_messages ] = useState<Record<string, string>>(
		NO_MESSAGES,
	)

	// Lazily initialised from the draft, so a form that had already been argued
	// with goes on showing its messages after a breakpoint swap.
	const [ is_showing, set_is_showing ] = useState( () =>
		attempted_ref.current
	)

	const [ is_sending, set_is_sending ] = useState( false )
	const [ send_failed, set_send_failed ] = useState( false )

	/*
	 | The single place the form's opinion of itself is formed.
	 |
	 | `collect_messages` reads the `<form>` — see `submission.ts` for why the
	 | DOM and not the mirror. Bailing out when nothing moved is what keeps a
	 | keystroke from re-rendering: only the one that fixes a field, or the one
	 | that breaks it, changes anything here.
	 */
	const reassess = useCallback( () => {
		const form = form_ref.current

		if ( !form ) {
			return
		}

		const found = collect_messages( form )

		set_messages( ( previous ) =>
			messages_match( previous, found ) ? previous : found
		)
	}, [ form_ref ] )

	const on_change = ( event: FormEvent ) => {
		const target = event.target

		if ( target instanceof HTMLInputElement && target.name ) {
			if ( target.type === "checkbox" ) {
				checked_ref.current[
					checkbox_key( target.name, target.value )
				] = target.checked
			} else {
				values_ref.current[target.name] = target.value
			}
		} else if ( target instanceof HTMLSelectElement && target.name ) {
			values_ref.current[target.name] = target.value
		}

		reassess()
	}

	const on_focus = ( event: FocusEvent ) => {
		const target = event.target

		// Focus landing on anything unnamed — the submit button, most likely —
		// clears the snapshot, so a swap at that moment restores Base UI's
		// default focus rather than throwing the visitor back into a field
		// they had already left. The caret is filled in by the cleanup below.
		focus_ref.current = target instanceof HTMLInputElement && target.name
			? {
				name: target.name,
				selection_end: null,
				selection_start: null,
			}
			: null
	}

	// Reads the caret off the field `on_focus` last named, at the one moment it
	// matters: this component going away. Closes over the `<form>` node rather
	// than reading `form_ref.current`, so it does not care whether React has
	// already detached the ref by the time it runs.
	useLayoutEffect( () => {
		const form = form_ref.current

		return () => {
			const focus = focus_ref.current

			if ( !form || !focus ) {
				return
			}

			const control = form.elements.namedItem( focus.name )

			if ( !( control instanceof HTMLInputElement ) ) {
				return
			}

			if ( !SELECTABLE_TYPES.has( control.type ) ) {
				return
			}

			focus_ref.current = {
				name: focus.name,
				selection_end: control.selectionEnd,
				selection_start: control.selectionStart,
			}
		}
	}, [ form_ref, focus_ref ] )

	// Once per mount, which — because this component only ever mounts when a
	// container does — means once per open and once per breakpoint swap. On a
	// swap it is what rebuilds the messages from the restored `defaultValue`s,
	// and it is why they do not need a ref of their own. On a first open it is
	// what greys the submit button before the first paint.
	useLayoutEffect( reassess, [ reassess ] )

	// A frame late on purpose: Base UI moves focus to the `initialFocus` target
	// during the open commit, and setting a selection range before that would
	// be overwritten. The snapshot is null on a plain open, so this is a no-op
	// there.
	useEffect( () => {
		const focus = focus_ref.current
		const form = form_ref.current

		if ( !focus || !form ) {
			return
		}

		const frame = requestAnimationFrame( () => {
			const control = form.elements.namedItem( focus.name )

			if ( !( control instanceof HTMLInputElement ) ) {
				return
			}

			if ( document.activeElement !== control ) {
				control.focus()
			}

			if ( focus.selection_start === null ) {
				return
			}

			control.setSelectionRange(
				focus.selection_start,
				focus.selection_end ?? focus.selection_start,
			)
		} )

		return () => cancelAnimationFrame( frame )
	}, [ form_ref, focus_ref ] )

	const on_submit = async ( event: FormEvent<HTMLFormElement> ) => {
		event.preventDefault()

		// A second press while the first is still in the air would spend a
		// second token and a second rate-limit slot for one registration.
		if ( is_sending ) {
			return
		}

		const form = event.currentTarget
		const found = collect_messages( form )

		// From here on the form answers back on every keystroke. Both of these
		// are one-way: nothing sets them false again, because the visitor
		// having asked once is not something that becomes untrue.
		attempted_ref.current = true
		set_is_showing( true )
		set_messages( found )

		if ( Object.keys( found ).length > 0 ) {
			// Focus follows the eye down the form, so the first problem in
			// DOCUMENT order is the one to go to — not the first one
			// `collect_messages` happened to find.
			const first = FIELD_ORDER.find( ( name ) => name in found )

			if ( first ) {
				form.querySelector<HTMLElement>( `[name="${first}"]` )
					?.focus()
			}

			return
		}

		set_send_failed( false )
		set_is_sending( true )

		try {
			/*
			 | `take`, not the `form_token` prop. The prop is what the form
			 | RENDERS from — it needs the honeypot's name — and taking is a
			 | different question: which token may be sent, given that the last
			 | attempt may have used one already.
			 |
			 | That case is the one worth spelling out. A token is spent the
			 | moment the relay verifies it, which happens well before the CMS
			 | is asked for anything — so a submission that fails at the CMS has
			 | already burned its token. Reusing it would be refused as a
			 | replay, and the visitor would be stuck on a form that fails
			 | identically however many times they press it, with nothing to
			 | suggest that closing and reopening would fix it. `take` mints a
			 | fresh one instead, and it lives in the provider so a breakpoint
			 | swap between the failure and the retry cannot forget.
			 */
			const token = await take_token()

			if ( !token ) {
				set_send_failed( true )
				return
			}

			const recorded = await send( form, token )

			if ( !recorded ) {
				set_send_failed( true )
				return
			}
		} catch {
			set_send_failed( true )
			return
		} finally {
			set_is_sending( false )
		}

		// `confirm()`, not `close()`: the container stays open and hands itself
		// over to the post-submission screen. Nothing here clears the draft,
		// deliberately — that screen greets the visitor by name and reads the
		// name out of it.
		confirm()
	}

	// The whole of the "when may a message appear" rule, in one line.
	// `messages` is what the form thinks; `shown` is what it has been given
	// leave to say.
	const shown = is_showing ? messages : NO_MESSAGES

	const problem_count = Object.keys( shown ).length
	const is_ready = Object.keys( messages ).length === 0

	return <form
		ref={ form_ref }
		className={ `flex flex-col ${className}` }
		noValidate
		onSubmit={ on_submit }
		onChange={ on_change }
		onFocus={ on_focus }>
		{
			/* `noValidate` above turns off the browser's own bubbles, NOT its
		     validation — `validity` is still filled in, and the `required`
		     attributes on the controls still reach assistive technology. What
		     we are declining is the presentation: those bubbles are
		     unstyleable, vanish on the next keystroke, appear one at a time,
		     and are not reliably reachable by a screen reader. */
		}

		<div className={ ROW_PAIR_CLASS }>
			{ TEXT_FIELDS.slice( 0, 2 ).map( ( field ) =>
				<Floating_Label_Field
					key={ field.name }
					field={ field }
					default_value={ values_ref.current[field.name] ?? "" }
					error={ shown[field.name] } />
			) }
		</div>

		<div className={ `mt-4 lg:mt-6 ${ROW_PAIR_CLASS}` }>
			{ TEXT_FIELDS.slice( 2, 4 ).map( ( field ) =>
				<Floating_Label_Field
					key={ field.name }
					field={ field }
					default_value={ values_ref.current[field.name] ?? "" }
					error={ shown[field.name] } />
			) }
		</div>

		{ TEXT_FIELDS.slice( 4 ).map( ( field ) =>
			<Floating_Label_Field
				key={ field.name }
				field={ field }
				default_value={ values_ref.current[field.name] ?? "" }
				error={ shown[field.name] }
				className="mt-4 lg:mt-6" />
		) }

		<Occupation_Field
			default_value={ values_ref.current[OCCUPATION.name] ?? "" }
			error={ shown[OCCUPATION.name] }
			className="mt-4 lg:mt-6" />

		<Interests_Field
			checked={ checked_ref.current }
			error={ shown[INTERESTS.name] }
			className="mt-4 lg:mt-6" />

		<Consent_Field
			consent={ PRIVACY_CONSENT }
			default_checked={ checked_ref.current[
				checkbox_key( PRIVACY_CONSENT.name, PRIVACY_CONSENT.value )
			] ?? false }
			error={ shown[PRIVACY_CONSENT.name] }
			className="mt-4 lg:mt-12" />

		<Consent_Field
			consent={ ACCURACY_DECLARATION }
			default_checked={ checked_ref.current[
				checkbox_key(
					ACCURACY_DECLARATION.name,
					ACCURACY_DECLARATION.value,
				)
			] ?? false }
			error={ shown[ACCURACY_DECLARATION.name] }
			className="mt-4 lg:mt-6" />

		<Honeypot name={ form_token?.honeypot } />

		{
			/* Said once, on submit, and only then — `problem_count` is zero
		     until something has been shown. Each field's own message is read
		     out by `aria-describedby` when focus arrives, so this only has to
		     carry the one thing that is not attached to any single field: how
		     much is left. `polite` because focus is moving in the same commit
		     and an assertive region would talk over the field it lands on. */
		}
		<p aria-live="polite" className="sr-only">
			{ problem_count > 0
				? `${problem_count} ${
					problem_count === 1 ? "field needs" : "fields need"
				} attention.`
				: "" }
		</p>

		{
			/* The one failure that is not a field's. `role="alert"` is right
		     here where it is wrong on a field message: this appears once, in
		     response to a press, rather than coming and going on the
		     keystroke. */
		}
		{ send_failed && <p
			role="alert"
			className="mt-4 text-caption text-red">
			{ COULD_NOT_SEND }
		</p> }

		<Button
			className={ `mt-4 md:mt-12 max-md:w-full self-start font-medium ${
				is_ready ? SUBMIT_READY_CLASS : SUBMIT_WAITING_CLASS
			}` }
			type="submit"
			size="lg"
			emphasis="custom"
			aria-busy={ is_sending || undefined }>
			Register Now
		</Button>
	</form>
}

/**
 |
 | The trap.
 |
 | A plausible name — a referral code, an invitation code — handed over by the
 | mint and rotated daily from a secret, so it is neither on a bot's skip list
 | nor learnable by meeting the form twice. It renders only once the token has
 | arrived, because until then there is no name for it to have.
 |
 | **Not `display: none`.** That, combined with a negative tab index and an
 | `aria-hidden` attribute, is the giveaway every form-filler checks for — the
 | three together are the fingerprint of a honeypot, and a script that spots
 | them leaves the field alone. Two of the three are kept, because they are what
 | keeps the field away from people: it is out of the tab order and out of the
 | accessibility tree, so nobody using a keyboard or a screen reader can land on
 | it. It is moved off screen instead of being removed from the layout.
 |
 | Be honest about the limit: this cannot stop an agent that renders the page
 | and reads it as a person would. It catches scripted form-fillers that parse
 | HTML and fill every input, which is a large share of junk traffic and not all
 | of it.
 |
 */
function Honeypot ( { name }: { name?: string } ) {
	if ( !name ) {
		return null
	}

	return <div
		aria-hidden="true"
		className="absolute w-px h-px -left-[9999px] overflow-hidden">
		{
			/* The label FOLLOWS THE NAME, and that is not tidiness. A label
		     permanently reading "Referral code" beside an input named
		     `booking_reference` is itself the tell the rotation exists to
		     remove: a form-filler that compares the two has found the trap
		     without having to know any of the names. */
		}
		<label htmlFor={ `registration-${name}` }>{ label_for( name ) }</label>
		<input
			id={ `registration-${name}` }
			name={ name }
			type="text"
			defaultValue=""
			tabIndex={ -1 }
			autoComplete="off" />
	</div>
}

/**
 |
 | The words beside the trap, derived from the name the mint chose.
 |
 | `booking_reference` reads as "Booking reference". Derived rather than mapped,
 | so the pool of names can grow in `form-token.server.ts` without a second list
 | here quietly falling behind it and putting the wrong words beside a field
 | again.
 |
 */
function label_for ( name: string ) {
	const words = name.replace( /_/g, " " )

	return words.charAt( 0 ).toUpperCase() + words.slice( 1 )
}

/**
 |
 | The submission itself: the form's own elements, the token, and the trap.
 |
 | Read off the elements rather than the draft's mirror. The mirror holds what
 | the delegated change handler last saw — a frame behind by definition, and
 | blind to anything a browser filled in without dispatching an event. The
 | elements are the answers.
 |
 */
async function send ( form: HTMLFormElement, token: Form_Token ) {
	const data = new FormData( form )

	const body: Record<string, unknown> = {
		accuracy_declaration: data.get( ACCURACY_DECLARATION.name ) !== null,
		company_or_school: text( data, "company_or_school" ),
		email: text( data, "email" ),
		first_name: text( data, "first_name" ),
		form_token: token.token,
		interests: data.getAll( INTERESTS.name ).map( String ),
		last_name: text( data, "last_name" ),
		mobile: text( data, "mobile" ),
		occupation: text( data, OCCUPATION.name ),
		privacy_consent: data.get( PRIVACY_CONSENT.name ) !== null,
		// Whatever a script put in it, which for a person is always "".
		[token.honeypot]: text( data, token.honeypot ),
	}

	const response = await fetch( SUBMIT_PATH, {
		body: JSON.stringify( body ),
		headers: { "content-type": "application/json" },
		method: "POST",
	} )

	return response.ok
}

function text ( data: FormData, name: string ) {
	const value = data.get( name )

	return typeof value === "string" ? value.trim() : ""
}
