
/**
 |
 | Session listing — a leaf. The home page's category rows.
 |
 | **One component, four renderings, dispatched on the category.** The design
 | draws each of the four differently and all four survive: showcases and
 | conversations turn in a looping carousel, experiences sit in a plain row, and
 | workshops wrap with the first one featured. What collapsed into one is the
 | schema, the registry entry, the populate fragment and the seed branch — eight
 | of each became one of each — because the four renderings vary along an axis
 | the data already carries.
 |
 | An editor chooses a category and a count. **The rows arrive already chosen**,
 | filtered to the event the page resolved to and capped, and this block cannot
 | tell them from a list somebody curated by hand.
 |
 | **The heading, the opening line and the "View All" link are the section's**,
 | which already carries all three. A listing that held its own would be a
 | second place for a heading to live and a second answer to where it sits.
 |
 | These are **not** the category listing pages. Those are ticket 09, they hold
 | a filtration widget and they show everything rather than a handful.
 |
 */

import type { ComponentType } from "react"

import type {
	Category,
	Session_Card,
} from "../envelope.ts"

import { Card } from "../cards.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"
import { Looping_Track } from "./looping-track.tsx"
import { use_full_bleed } from "./section-frame.tsx"

type Session_Listing_Props = {
	category?: Category
	sessions?: Session_Card[]
}

export function Session_Listing (
	{ category, sessions = [] }: Session_Listing_Props,
) {
	if ( sessions.length === 0 ) {
		return null
	}

	// A fifth category costs a visitor the plainest of the four arrangements
	// rather than costing them the row. The catalogue grows in the CMS before
	// it grows here, routinely, and the block registry makes the same
	// allowance for the same reason.
	const Rendering = RENDERINGS[category as Category] ?? Rows

	return <div className={ BLOCK_SPACING }>
		<Rendering sessions={ sessions } />
	</div>
}

type Rendering_Props = {
	/** The track's own spacing, which is what the two looping rows differ in. */
	className?: string
	sessions: Session_Card[]
}

/**
 |
 | Showcases and conversations: a looping row of wide cards, dragged, thrown or
 | scrolled.
 |
 | These are the two rows the design gives the most room to, and each loops
 | because it sits against a full-bleed colour field with no edge to run out at.
 | **They differ in their spacing and in nothing else**, so that difference is a
 | class in the map below rather than a second copy of this — and a change to
 | how a loop measures itself cannot fix one row and miss the other.
 |
 | **This is the rendering that takes the section's full width.** A loop that
 | stopped at the twelve-column container would show its own ends, which is the
 | one thing a loop is for hiding. The other two renderings are grids of tiles
 | and stay inside the container with everything else.
 |
 */
function Turning ( { className = "", sessions }: Rendering_Props ) {
	return <Looping_Track
		className={ `${use_full_bleed()} ${className}` }
		slide_className="w-73.5 md:w-5c">
		{ sessions.map( ( session ) =>
			<Card
				key={ session.documentId }
				className="select-none"
				session={ session } />
		) }
	</Looping_Track>
}

/**
 |
 | Experiences: a plain row, stacked on a phone. No carousel at all — there are
 | few enough of them that scrolling would be an affordance with nothing behind
 | it.
 |
 */
function Rows ( { sessions }: Rendering_Props ) {
	return <ul className="mt-8 flex flex-col md:flex-row *:shrink-0 *:w-3c gap-4 md:*:w-4c md:gap-1g">
		{ sessions.map( ( session ) =>
			<li key={ session.documentId }>
				<Card className="select-none" session={ session } />
			</li>
		) }
	</ul>
}

/**
 |
 | Workshops: the same row, wrapping, with **the first one featured** — which
 | from the medium breakpoint upward turns it side-on, takes the whole width and
 | shows its standfirst. `card--featured` is a rule in
 | `tailwind-v3/components/card.css` and is already behind that breakpoint.
 |
 */
function Wrapping ( { sessions }: Rendering_Props ) {
	return <ul className="mt-8 flex flex-col md:flex-row flex-wrap *:shrink-0 *:w-3c gap-4 md:*:w-4c md:gap-1g">
		{ sessions.map( ( session, index ) =>
			<li
				// The featured card takes the whole row, so the item holding it
				// has to as well — and it has to say so louder than the row's own
				// `*:w-4c`, which is a child selector and outweighs a plain width.
				//
				// The class is named by index rather than through Tailwind's
				// `first:`, because each card sits inside a list item of its own
				// and is therefore always its parent's first child.
				className={ index === 0 ? "md:!w-full" : "" }
				key={ session.documentId }>
				<Card
					className={ `${
						index === 0 ? "card--featured" : ""
					} select-none` }
					session={ session } />
			</li>
		) }
	</ul>
}

/**
 |
 | The four renderings, and which category gets which.
 |
 | Four entries, because there are four of them and each is the design's own.
 | Two of the four are the same track with different spacing, and saying so here
 | is what keeps them from being two files that drift.
 |
 */
const RENDERINGS: Record<Category, ComponentType<Rendering_Props>> = {
	Conversation: ( props ) =>
		<Turning { ...props } className="mt-8 pb-8 md:pb-16" />,
	Experience: Rows,
	Showcase: ( props ) =>
		<Turning { ...props } className="pt-8 pb-6 md:pb-16" />,
	Workshop: Wrapping,
}
