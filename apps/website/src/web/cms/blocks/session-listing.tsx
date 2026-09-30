/**
 |
 | Session listing — a leaf. The home page's category rows.
 |
 | An editor chooses a category and a count. **The rows arrive already chosen**,
 | filtered to the event the page resolved to and capped, and this block cannot
 | tell them from a list somebody curated by hand.
 |
 | **The category chooses the sessions, not the layout.** How the row is laid
 | out follows from how many sessions arrived — see `arranged-cards.tsx`, which
 | the curated session list draws through too.
 |
 | **The heading, the opening line and the "View All" link are the section's**,
 | which already carries all three. A listing that held its own would be a
 | second place for a heading to live and a second answer to where it sits.
 |
 | These are **not** the category listing pages. Those hold a filtration widget
 | and they show everything rather than a handful.
 |
 */

import type { Session_Card } from "../envelope.ts"
import type { Style_And_Transition } from "../cards.tsx"

import { Arranged_Cards } from "./arranged-cards.tsx"
import { BLOCK_SPACING } from "./block-spacing.ts"

type Session_Listing_Props = {
	sessions?: Session_Card[]
	style_and_transition?: Style_And_Transition
}

export function Session_Listing (
	{ sessions = [], style_and_transition }: Session_Listing_Props,
) {
	if ( sessions.length === 0 ) {
		return null
	}

	return <div className={ BLOCK_SPACING }>
		<Arranged_Cards
			sessions={ sessions }
			style_and_transition={ style_and_transition } />
	</div>
}
