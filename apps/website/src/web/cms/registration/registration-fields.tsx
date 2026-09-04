
/**
 |
 | The four kinds of control this form is made of. Every one of them is a NATIVE
 | control — `<input>`, `<select>`, `<input type="checkbox">` — wearing our
 | clothes.
 |
 | That is a decision, not an oversight. A native control arrives already
 | knowing how to be focused, typed into, autofilled, announced, translated,
 | zoomed, dictated into and driven from a keyboard, on every browser this build
 | supports and on every assistive technology it does not test against. None of
 | that has to be rebuilt here, and none of it can be got wrong here.
 |
 | Where a native control cannot be painted the way the design asks — a checkbox
 | that reads as a filled button — the input is moved out of sight with
 | `sr-only` and a `<span>` is painted in its place. The input is still the thing
 | that is focused, checked, tabbed to and submitted; the span is scenery, and is
 | marked `aria-hidden` to say so.
 |
 | GEOMETRY. Every field in this file is 64px of vertical box before its error
 | message: a 16px label line, an 8px gap, and a 40px control. The floating
 | fields reserve that top 24px as padding whether or not the label is currently
 | up there, so nothing on the page moves when a label lifts. That is why the
 | label leadings below are pinned (`leading-4` up, `leading-5` at rest) rather
 | than left to the responsive type scale: the reserved space has to be a known
 | number, and `top-8.5` — 34px — is the one value that centres a 20px line box
 | on a 40px control sitting 24px down.
 |
 | ONLY COMPONENTS ARE EXPORTED, so this file stays a Fast Refresh boundary.
 |
 */

import type { ReactNode } from "react"
import { Fragment } from "react"
import { Link } from "react-router"

import type {
	Consent_Spec,
	Text_Field_Spec,
} from "./submission.ts"

import {
	checkbox_key,
	INTERESTS,
	OCCUPATION,
} from "./submission.ts"

import { Check_Mark } from "#infra/lib/ui/react/icons/check-mark.tsx"
import { Chevron_Down } from "#infra/lib/ui/react/icons/chevron-down.tsx"
import { Warning_Sign } from "#infra/lib/ui/react/icons/warning-sign.tsx"

// The floated state is written as the DEFAULT and the resting state as the
// exception, because `peer-resting` (see tailwind-v3/state-variants.ts) is a
// compound selector and therefore always outranks these — the exception has to
// be the one with the specificity.
const LABEL_CLASS = [
	"absolute top-0 left-0 truncate pointer-events-none",
	"transition-all duration-150 ease-out motion-reduce:transition-none",

	// Above the control: 8px clear of it, smaller, heavier, faded back.
	"-translate-y-6 lg:-translate-y-6.25 text-input lg:text-small font-medium opacity-[0.35]",

	// On the control: aligned with the text the visitor is about to type, at
	// exactly the size and weight that text will be.
	"peer-resting:translate-y-0 peer-resting:text-p peer-resting:font-normal peer-resting:opacity-100",
].join( " " )

const LABEL_CLASS__FOR_MOBILE_WEBKIT = "mobile-webkit:peer-resting:text-base"

// What a label looks like once it is above its control — worn permanently by
// the two fields whose labels never sat on one (the select and the group).
const STATIC_LABEL_CLASS =
	"block text-small font-medium leading-4 opacity-[0.35] text-black"

const CONTROL_CLASS =
	"appearance-none w-full bg-white text-p mobile-webkit:text-base text-black focus:outline-none"

function Field_Error (
	{ className = "", id, message }: {
		className?: string
		id: string
		message?: string
	},
) {
	if ( !message ) {
		return null
	}

	// No `role="alert"`. From the first failed submit onwards these come and go
	// on the keystroke, and a live region firing per keystroke would talk over
	// itself continuously. The announcement that matters — how many problems
	// there are — is made once, on submit, by the form's own live region; from
	// then on `aria-describedby` reads the message out whenever the field is
	// returned to.
	return <p id={ id } className={ `mt-1 text-caption text-red ${className}` }>
		<Warning_Sign className="float-left mr-1 inline-block size-3 lg:size-4" />
		{ message }
	</p>
}

/*
 | Fields 1–5. The label starts on the control and lifts off it on focus — or
 | the moment there is anything to type over, whichever comes first.
 |
 | THAT SECOND CONDITION IS NOT IN THE BRIEF and is deliberate: a label that
 | only lifted on focus would drop back on top of what had just been typed the
 | instant the field was left. `peer-resting` therefore reads "empty AND
 | unfocused", and `placeholder=" "` is what makes "empty" a thing CSS can see.
 |
 | No JavaScript is involved in any of that. The labels are in the right place
 | on the first paint, before React has hydrated, and they stay right if it
 | never does.
 */
export function Floating_Label_Field (
	{ className = "", default_value, error, field }: {
		className?: string
		default_value: string
		error?: string
		field: Text_Field_Spec
	},
) {
	const error_id = `${field.id}-error`

	return <div className={ className }>
		<div className="border-b border-gray-dark pb-1 pt-6">
			<div className="relative inline-flex">
				<input
					id={ field.id }
					name={ field.name }
					type={ field.type }
					required
					placeholder=" "
					defaultValue={ default_value }
					autoComplete={ field.autocomplete }
					autoCapitalize={ field.type === "text"
						? "words"
						: "none" }
					autoCorrect="off"
					spellCheck={ false }
					enterKeyHint="next"
					aria-invalid={ error ? true : undefined }
					aria-describedby={ error ? error_id : undefined }
					className={ `peer ${CONTROL_CLASS}` } />

				{
					/* After the input, not before it: `peer-*` is a sibling
				     combinator and only reaches forwards. The association is
				     `htmlFor`, which does not care about order, and neither
				     does the accessible name it produces. */
				}
				<label
					htmlFor={ field.id }
					className={ `${LABEL_CLASS} ${LABEL_CLASS__FOR_MOBILE_WEBKIT}` }>
					{ field.label }
				</label>
			</div>
		</div>

		<Field_Error id={ error_id } message={ error } />
	</div>
}

/*
 | Field 6. A real `<select>`, stripped of its native arrow and given ours.
 |
 | Native because the alternative — a listbox built out of divs — would be worse
 | on every device that matters here: on a phone this opens the platform's own
 | picker, and on a desktop it is already keyboard-complete and type-ahead
 | searchable.
 */
export function Occupation_Field (
	{ className = "", default_value, error }: {
		className?: string
		default_value: string
		error?: string
	},
) {
	const error_id = `${OCCUPATION.id}-error`

	return <div className={ className }>
		<label htmlFor={ OCCUPATION.id } className={ STATIC_LABEL_CLASS }>
			{ OCCUPATION.label }
		</label>

		<div className="relative mt-2 border-b border-gray-dark pb-1">
			<select
				id={ OCCUPATION.id }
				name={ OCCUPATION.name }
				required
				defaultValue={ default_value }
				autoComplete="organization-title"
				aria-invalid={ error ? true : undefined }
				aria-describedby={ error ? error_id : undefined }
				className={ `cursor-pointer ${CONTROL_CLASS}` }>
				{
					/* Selectable only in the sense that it is where the field
				     starts. `disabled` closes the way back to it. */
				}
				<option value="" disabled>{ OCCUPATION.placeholder }</option>

				{ OCCUPATION.options.map( ( option ) =>
					<option key={ option.value } value={ option.value }>
						{ option.label }
					</option>
				) }
			</select>

			{
				/* Scenery. The select underneath it is what receives the click
			     — hence `pointer-events-none`. */
			}
			<Chevron_Down
				aria-hidden="true"
				className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-black" />
		</div>

		<Field_Error id={ error_id } message={ error } />
	</div>
}

// The chip. `peer-checked:` fills it; the ring sits on an offset so it stays
// visible against the fill. `peer-focus:` rather than `peer-focus-visible:`
// deliberately — Safari 15.0 predates `:focus-visible`, and a keyboard user
// there would otherwise have no idea where they are. The cost is a ring after
// a mouse click, which is a fair price for a focus indicator that exists.
const INTEREST_CHIP_CLASS = [
	"inline-flex justify-center items-center h-10 p-2 _px-4 rounded border cursor-pointer select-none",
	"text-small font-semibold lg:font-medium text-black bg-white border-gray-dark",
	"transition-colors duration-150 ease-out motion-reduce:transition-none",
	"hover:border-black/40",
].join( " " )

const INTEREST_INPUT_CLASS = {
	conversations: "peer/conversation",
	experiences: "peer/experience",
	showcases: "peer/showcase",
	workshops: "peer/workshop",
} as const

const INTEREST_SPECIFIC_CLASS = {
	conversations: "peer-checked/conversation:bg-conversation",
	experiences: "peer-checked/experience:bg-experience",
	showcases: "peer-checked/showcase:bg-showcase",
	workshops: "peer-checked/workshop:bg-workshop",
} as const

/*
 | Field 7. A `<fieldset>` and a `<legend>`, which is the markup that makes four
 | checkboxes one question — the legend is read out with each option, so
 | "Showcases" is announced as "Interested in, Showcases".
 |
 | The chips are laid out by a `<div>` inside the fieldset rather than by the
 | fieldset itself. `display: flex` on a `<fieldset>` has a long history of
 | disagreeing with itself across browsers, and a wrapper costs nothing.
 */
export function Interests_Field (
	{ checked, className = "", error }: {
		/** The draft's whole checked-box map, keyed by `checkbox_key`. */
		checked: Record<string, boolean>
		className?: string
		error?: string
	},
) {
	const error_id = `${INTERESTS.name}-error`

	return <fieldset
		className={ className }
		aria-describedby={ error ? error_id : undefined }>
		<legend className={ STATIC_LABEL_CLASS }>{ INTERESTS.legend }</legend>

		<div className="mt-2 flex max-md:flex-wrap max-sm:gap-2 md:gap-2 *:grow *:max-w-28.5">
			{ INTERESTS.options.map( ( option ) =>
				// No wrapper element: `sr-only` is `position: absolute`, so the
				// input is out of flow and is not a flex item. It stays a
				// sibling of its label, which is all `peer-*` asks for.
				<Fragment key={ option.value }>
					<input
						id={ option.id }
						name={ INTERESTS.name }
						type="checkbox"
						value={ option.value }
						defaultChecked={ checked[
							checkbox_key( INTERESTS.name, option.value )
						] ?? false }
						className={ `peer sr-only ${
							INTEREST_INPUT_CLASS[option.value]
						}` } />

					<label
						htmlFor={ option.id }
						className={ `${INTEREST_CHIP_CLASS} [.peer:checked+&]:text-white ${
							INTEREST_SPECIFIC_CLASS[option.value]
						}` }>
						{ option.label }
					</label>

					{ /* spacer */ }
					<span
						className="hidden sm:block md:hidden last:hidden basis-0 grow !max-w-2"
						aria-hidden={ true } />
				</Fragment>
			) }
		</div>

		<Field_Error id={ error_id } message={ error } />
	</fieldset>
}

/*
 | The box, borrowed WHOLESALE from the filtration widget so the two read as the
 | same control: 16px square, a 1.5px border in the current colour, a 5px
 | radius, no fill, and a check mark inset by those same four odd paddings.
 | `border-current` is what lets the error state be a single text-colour swap.
 |
 | The one thing not borrowed is `items-center` on the row. Filtration's labels
 | are one line each; these two run to three or four, and centring a checkbox
 | against a paragraph leaves it floating in the middle of nowhere. The row is
 | `items-start` and the box is nudged down to sit on the FIRST line — that
 | offset is half the difference between the line box and the box, and it is
 | written as a calc because `text-p`'s size and leading both change at `lg`.
 */
const CONSENT_BOX_CLASS = [
	"shrink-0 inline-block size-6 p-1 border-[1.5px] border-current rounded-[5px]",
	"mt-[calc((var(--text-p-fs)*var(--text-p-lh)_-_1rem)/2)]",
	"text-black",
	"peer-focus-deep:ring-2 peer-focus-deep:ring-theme",
	"peer-focus-deep:ring-offset-2 peer-focus-deep:ring-offset-white",
].join( " " )

// Filtration's `Checkbox.Indicator` unmounts the mark when unchecked. Ours
// fades it, which is the same thing to look at and one fewer thing to mount.
const CONSENT_CHECK_CLASS = [
	"size-full ml-[0.5px] mt-px",
	"opacity-0 peer-checked-deep:opacity-100",
	"transition-opacity duration-150 ease-out motion-reduce:transition-none",
].join( " " )

/*
 | Fields 8 and 9. The box and the copy are both inside the `<label>`, so the
 | whole line is one target — and the box is therefore a DESCENDANT of the
 | input's sibling, not the sibling itself. That is what `peer-checked-deep` is
 | for; stock `peer-checked:` would never reach it.
 */
export function Consent_Field (
	{ className = "", consent, default_checked, error }: {
		className?: string
		consent: Consent_Spec
		default_checked: boolean
		error?: string
	},
) {
	const error_id = `${consent.id}-error`

	return <div className={ className }>
		<input
			id={ consent.id }
			name={ consent.name }
			type="checkbox"
			value={ consent.value }
			required
			defaultChecked={ default_checked }
			aria-invalid={ error ? true : undefined }
			aria-describedby={ error ? error_id : undefined }
			className="peer sr-only" />

		<label
			htmlFor={ consent.id }
			className="flex items-start gap-4 cursor-pointer text-p md:text-small font-semibold md:font-medium text-black">
			{
				/* The colour drives the border AND the mark, both being
			     `currentColor` — so an error turns the whole box red. */
			}
			<span aria-hidden="true" className={ CONSENT_BOX_CLASS }>
				<Check_Mark className={ CONSENT_CHECK_CLASS } />
			</span>

			<span className="mt-1 max-md:max-w-96">
				<Consent_Text consent={ consent } />
			</span>
		</label>

		{ /* Lined up under the copy: 16px of box plus the 16px gap. */ }
		<Field_Error id={ error_id } message={ error } className="ml-10" />
	</div>
}

/**
 |
 | The sentence, with its one link spliced back in.
 |
 | **The sentence is a single string** — see `submission.ts` — because it is
 | also the wording stored against the record, and a copy written out as JSX
 | here would eventually say something the record does not. So the link is
 | applied to the phrase rather than the sentence being assembled around it: the
 | words come from one place, and this decides only which of them are
 | underlined.
 |
 | A sentence whose phrase is not in it renders as plain text rather than
 | silently losing the link, which is the failure worth having if the wording is
 | ever revised without the phrase being updated with it.
 |
 */
function Consent_Text ( { consent }: { consent: Consent_Spec } ): ReactNode {
	if ( !consent.link ) {
		return consent.text
	}

	const at = consent.text.indexOf( consent.link.phrase )

	if ( at === -1 ) {
		return consent.text
	}

	return <>
		{ consent.text.slice( 0, at ) }
		{
			/* A new tab, and not for the usual reason: the registration
		     provider is mounted PER PAGE, so navigating away in this tab would
		     take the half-filled draft with it.

		     No click handler is needed to stop the surrounding `<label>` from
		     toggling the checkbox as the click passes through. The platform
		     already declines to run a label's activation behaviour for events
		     targeted at interactive content inside it, and a link is
		     interactive content. */
		}
		<Link
			to={ consent.link.url }
			target="_blank"
			rel="noreferrer"
			className="underline underline-offset-2">
			{ consent.link.phrase }
		</Link>
		{ consent.text.slice( at + consent.link.phrase.length ) }
	</>
}
