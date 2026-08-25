
/**
 |
 | REGISTRATION FORM — where the state lives, and why it lives here.
 |
 | The form is housed in a `Drawer` below the medium breakpoint and a `Dialog`
 | from it up. Those are different component trees, so crossing the breakpoint
 | unmounts one and mounts the other, and React destroys everything in between.
 | Nothing the visitor has typed can therefore live inside the form itself.
 |
 | It lives here instead, in refs that outlive the swap:
 |
 |   `values_ref`     every named control's value, written continuously by a
 |                    delegated handler on the <form>
 |   `checked_ref`    the same, for checkboxes, which carry a checked flag
 |                    rather than a value and share a name across a group
 |   `focus_ref`      which control had focus, and where its caret sat
 |   `attempted_ref`  whether Submit has been pressed — the one thing that
 |                    decides whether the form's errors are shown at all
 |   `form_ref`       the <form> element, so the host can resolve a control by
 |                    name when it hands Base UI an `initialFocus` target
 |
 | The error MESSAGES are not among them, and that is the point: they are
 | derived from the controls, so one pass over the <form> after the swap
 | reproduces them exactly. Only what cannot be recomputed is kept.
 |
 | REFS, NOT STATE, deliberately. This provider wraps a whole page, so typing
 | must not re-render anything. `is_open` and `is_submitted` are the only state
 | here.
 |
 | Two contexts, for the same reason. The actions context never changes
 | identity, so consuming it costs a trigger nothing: a trigger that reads only
 | the actions does not re-render when the form opens. `is_open` is deliberately
 | kept out of that half, so nothing pays for it by default — for a modal the
 | right attribute is `aria-haspopup` rather than `aria-expanded`, so a trigger
 | has no ordinary reason to want it.
 |
 | One trigger does. `Registration_Form_Trigger` hides itself while the drawer
 | is open, because the drawer carries a facsimile of it up the screen and two
 | of them on screen at once would give the trick away. It opts into the open
 | context for that, and re-renders on every open and close — one button, no
 | children, nothing measured. The separation still earns its keep: every OTHER
 | consumer of the actions context, the site header included, stays out of it.
 |
 | The contexts themselves live in `registration-context.ts`, and this file must
 | export ONLY the component below. Both of those are Fast Refresh requirements
 | rather than taste — the reasoning is written out in that file.
 |
 | One consequence worth knowing: the popup is not `keepMounted`, so the form
 | also unmounts when it closes — and the draft therefore survives a dismissal.
 | Reopening restores what was typed. That is deliberate (see `close` below),
 | but it is a product decision as much as a technical one.
 |
 | ─── AFTER A SUCCESSFUL SUBMISSION ──────────────────────────────────────────
 |
 | The container stops housing a form at all. `is_submitted` goes true once and
 | there is nothing that sets it back. Every close and reopen from then on lands
 | on the post-submission screen.
 |
 | It lives HERE rather than in the host for one reason: the draft has to
 | outlive it. The screen greets the visitor by name, and that name is read
 | straight out of `values_ref` — so unlike a dismissal, a successful submission
 | must NOT clear anything. Nothing resets, which is why there is no reset to
 | get wrong.
 |
 | ─── WHERE IT IS MOUNTED ────────────────────────────────────────────────────
 |
 | Inside the root block, around the whole page and inside the tunnel's
 | provider — so that the host's fill has a screen channel to travel through,
 | and so that everything it renders sits inside this page's colour variables.
 |
 */

import type { ReactNode } from "react"
import {
	useMemo,
	useRef,
	useState,
} from "react"

import type {
	Event,
	Page_Shell,
} from "../envelope.ts"
import type {
	Registration_Actions,
	Registration_Focus,
} from "./registration-context.ts"

import {
	Registration_Actions_Context,
	Registration_Open_Context,
	Registration_Submitted_Context,
} from "./registration-context.ts"
import { Registration_Form_Host } from "./registration-form-host.tsx"
import { use_form_token } from "./use-form-token.ts"

export function Registration_Provider (
	{ children, main_event, page_shell }: {
		children: ReactNode
		main_event: Event | null
		page_shell: Page_Shell | null
	},
) {
	const [ is_open, set_is_open ] = useState( false )
	const [ is_submitted, set_is_submitted ] = useState( false )

	const form_ref = useRef<HTMLFormElement | null>( null )
	const values_ref = useRef<Record<string, string>>( {} )
	const checked_ref = useRef<Record<string, boolean>>( {} )
	const focus_ref = useRef<Registration_Focus | null>( null )
	const attempted_ref = useRef( false )

	/**
	 |
	 | The form token, minted when the overlay opens and **never during server
	 | rendering** — page responses are cached, and a token in cached HTML would
	 | be the same one for every visitor holding that entry.
	 |
	 | It lives here rather than in the form because the form remounts when the
	 | viewport crosses the medium breakpoint, and a second mint there would
	 | restart the timing check on somebody who had been typing for two minutes.
	 |
	 */
	const {
		ensure: ensure_token,
		forget: forget_token,
		minted,
		take: take_token,
	} = use_form_token()

	// Empty dependency list on purpose: this value must keep its identity for
	// the lifetime of the page, so that consuming it costs a trigger nothing.
	//
	// `ensure_token` and `forget_token` are stable for the same reason — they
	// are `useCallback`s with no dependencies — so naming them here does not
	// cost the memo its identity.
	const actions = useMemo<Registration_Actions>( () => ( {
		// The typed values survive a dismissal; the focus snapshot does not.
		// Restoring the caret is only the right thing to do when the remount
		// was a breakpoint swap the visitor did not ask for. After a
		// deliberate close, the form should reopen the way it always does —
		// dropping the snapshot here is what makes `initialFocus` fall back to
		// Base UI's default behaviour.
		close: () => {
			focus_ref.current = null
			set_is_open( false )
		},

		// One way, and nothing else changes. The draft in particular is left
		// exactly as it was — the post-submission screen reads the visitor's
		// name out of it.
		//
		// The token is dropped, because it has just been spent. Holding it
		// would leave the form rendering a honeypot named after a trap the
		// server would refuse the next submission for reusing.
		confirm: () => {
			forget_token()
			set_is_submitted( true )
		},

		draft: { attempted_ref, checked_ref, focus_ref, form_ref, values_ref },

		// **The mint happens here**, at the moment somebody opens the overlay,
		// which is also the moment the timing check should start counting
		// from. Nothing is awaited: the request goes out alongside the opening
		// animation, and the form asks for one itself if a very quick visitor
		// gets to Register first.
		open: () => {
			set_is_open( true )
			void ensure_token()
		},
	} ), [ ensure_token, forget_token ] )

	// `children` arrives as a prop, so when `is_open` changes and this
	// component re-renders, the children element is referentially unchanged
	// and React bails out of the entire page subtree. Moving the `useState` up
	// into the root block would look identical and re-render every section on
	// the page. Please keep it here.
	return <Registration_Actions_Context value={ actions }>
		<Registration_Open_Context value={ is_open }>
			<Registration_Submitted_Context value={ is_submitted }>
				{ children }

				<Registration_Form_Host
					form_token={ minted }
					main_event={ main_event }
					page_shell={ page_shell }
					take_token={ take_token } />
			</Registration_Submitted_Context>
		</Registration_Open_Context>
	</Registration_Actions_Context>
}
