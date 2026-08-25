
/**
 |
 | The registration form's headline — one line of copy, and the geometry the
 | three places that render it below the medium breakpoint have to agree on to
 | the pixel:
 |
 |   1. `Registration_Form_Trigger`    the real, in-flow trigger at page bottom
 |   2. the drawer's header line       the same copy, revealed once open
 |   3. the drawer's trigger facsimile the decorative copy that rides up on top
 |                                     of (2) and fades out — see the host
 |
 | If (1) and (3) ever stop matching, the swap at the first frame of the
 | opening animation becomes visible and the whole illusion collapses.
 |
 | **The dates come from the main event**, where the static site had them
 | hardcoded. That is the one change in the lift, and it follows the same rule
 | the rest of the chrome does: the header's date range, the Register Now
 | button and this line all advertise the event that is running, on every page
 | of the site including a page belonging to an older edition.
 |
 | With no event marked main there is nothing to register for, and the line
 | falls back to "RSVP" alone — a date nobody set is not a date to invent.
 |
 | CONSTANTS AND ONE FUNCTION, no components. This module is imported by the
 | trigger and by the host, and a module that exports anything other than
 | components is not a Fast Refresh boundary — keeping these out of either
 | component file leaves both of them refreshing in place. Same reasoning as
 | `registration-context.ts`.
 |
 */

import type { ReactNode } from "react"

import type { Event } from "../envelope.ts"

import { event_range_in_full } from "../event-dates.ts"

export function registration_headline ( event: Event | null ): ReactNode {
	const range = event_range_in_full( event )

	return <>
		<b className="font-medium lg:font-semibold">RSVP</b>{" "}
		{ range && <>for { range }</> }
	</>
}

/*
 | The row itself. `h-16` is not decoration: it is the distance the drawer rests
 | proud of the bottom edge while closed, so it must be a KNOWN value rather
 | than one the text happens to produce. It is also exactly what the padding
 | and the line box add up to today — `pt-4` (1rem) + `text-h4`'s line box
 | (1.25rem × 1.4 = 1.75rem) + `pb-5` (1.25rem) = 4rem — so declaring it
 | changes nothing visually and stops the peek distance from drifting when the
 | type scale moves. `registration-form-host.tsx` hard-codes the matching
 | `calc( 100% - 4rem )`; Tailwind's scanner reads class names as literal text,
 | so neither end can be a computed string. Change one, change the other.
 */
export const HEADLINE_ROW_CLASS =
	"block w-full h-16 pt-4 pb-5 rounded-t-lg [data-open]:-mb-1"

/** Aligns the line to the page's content container, at any of the three sites. */
export const HEADLINE_INNER_CLASS =
	"cc mx-auto flex justify-between items-center"
