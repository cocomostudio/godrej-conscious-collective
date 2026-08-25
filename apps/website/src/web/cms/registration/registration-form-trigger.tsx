
/**
 |
 | Opens the registration form below the medium breakpoint. Its counterpart from
 | there up is the "Register Now" button in the site header; the two share one
 | `Drawer`/`Dialog` and one draft, both owned by the provider.
 |
 | Client-only. The popup it opens needs JavaScript, so a server-rendered
 | trigger would be a dead control until hydration. It is in flow rather than
 | fixed (`sticky bottom-0` at the call site), so its arrival shifts the page
 | content up by its own height — accepted deliberately.
 |
 | It follows the **main event**, like the header's Register Now: with no event
 | running there is nothing to register for, so the trigger is absent rather
 | than present and inert.
 |
 | WHILE THE FORM IS OPEN THIS BUTTON IS INVISIBLE, and the drawer carries a
 | facsimile of it instead (see the host). That is what buys the illusion of the
 | trigger rising: the copy starts life exactly on top of this button, so the
 | moment the drawer takes over is not a moment anyone can see. Leaving the real
 | one lit would put two identical bars on screen the instant the drawer moved
 | off it.
 |
 | It therefore consumes the open context, unlike every other trigger — one
 | re-render of one button per open and close, which is nothing. `opacity`
 | rather than `hidden`: this element is in flow and holds the page's bottom
 | 4rem open, and collapsing that would shift the page under the drawer.
 |
 */

import type { Event } from "../envelope.ts"

import {
	use_registration_actions,
	use_registration_is_open,
	use_registration_is_submitted,
} from "./registration-context.ts"
import {
	HEADLINE_INNER_CLASS,
	HEADLINE_ROW_CLASS,
	registration_headline,
} from "./registration-headline.tsx"

import { Plus } from "#infra/lib/ui/react/icons/plus.tsx"
import { use_is_mounted } from "#infra/lib/ui/react/use-is-mounted.ts"

// Comes back only once the drawer has finished its exit and unmounted — 200ms
// of descent, then 150ms of the facsimile fading in on top of it (both set in
// the host). Revealed any earlier and it would light up underneath a drawer
// still on its way down, which is the doubling described above, in reverse.
const REVEAL_CLASS = "opacity-100 transition-opacity duration-0 delay-350"

// Once the form has been submitted there is no facsimile and no rise to wait
// for: the drawer simply leaves, downwards, all the way. Nothing is being
// handed over, so nothing has to be waited on — this button is back the instant
// the drawer starts going, and the drawer covers it on the way past.
//
// The copy does not change. Pressing it again reopens the same confirmation, so
// it is a way back to the receipt rather than a second chance to register.
const REVEAL_AT_ONCE_CLASS = "opacity-100 transition-opacity duration-0"

const HIDE_CLASS = "opacity-0 pointer-events-none"

export function Registration_Form_Trigger (
	{ className = "", main_event }: {
		className?: string
		main_event: Event | null
	},
) {
	const { open } = use_registration_actions()
	const is_open = use_registration_is_open()
	const is_submitted = use_registration_is_submitted()
	const is_mounted = use_is_mounted()

	if ( !is_mounted || !main_event ) {
		return null
	}

	return <button
		type="button"
		onClick={ open }
		aria-haspopup="dialog"
		className={ [
			HEADLINE_ROW_CLASS,
			"text-left bg-theme cursor-pointer",
			is_open
				? HIDE_CLASS
				: is_submitted
				? REVEAL_AT_ONCE_CLASS
				: REVEAL_CLASS,
			className,
		].join( " " ) }>
		<span className={ HEADLINE_INNER_CLASS }>
			<span className="text-h4 text-white">
				{ registration_headline( main_event ) }
			</span>
			<Plus className="text-white" />
		</span>
	</button>
}
