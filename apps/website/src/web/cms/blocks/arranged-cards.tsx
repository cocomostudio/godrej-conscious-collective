
/**
 |
 | A list of session cards, laid out by how many cards arrived.
 |
 | Both listings of session cards draw through this — the session listing,
 | which the event fills, and the session list, which an editor curates — so
 | the two cannot drift into two designs for the same row.
 |
 | **The count decides, and nothing else does.** Not the category, and not the
 | count an editor asked for: an automatic listing that asks for six and
 | receives four draws what four draw, because that is what the page actually
 | holds.
 |
 |   • 1 to 3 cards: **a three in a row**.
 |   • Exactly 4: **a featured plus three in a row**.
 |   • 5 or more: **a carousel**.
 |
 | The treatment passes through every arrangement untouched. What a card does
 | under a pointer is the editor's answer, and an arrangement that overrode it
 | would be a second answer to a question already asked.
 |
 */

import type { ComponentType } from "react"

import type { Session_Card } from "../envelope.ts"
import type { Style_And_Transition } from "../cards.tsx"

import { Card } from "../cards.tsx"

import { Looping_Track } from "./looping-track.tsx"
import { use_column_bleed } from "./section-frame.tsx"

type Arrangement_Props = {
	/**
	 |
	 | Whether the points line and the featured card's rule are forced to
	 | black at rest. See `Card`.
	 |
	 */
	normalise_colors?: boolean
	sessions: Session_Card[]
	style_and_transition?: Style_And_Transition
}

export function Arranged_Cards ( props: Arrangement_Props ) {
	const Arrangement =
		ARRANGEMENTS[arrangement_of_count( props.sessions.length )]

	return <Arrangement { ...props } />
}

export type Arrangement =
	| "ThreeInARow"
	| "Featured_Plus_ThreeInARow"
	| "Carousel"

/**
 |
 | Which arrangement a count of cards takes. Exported because a heading row
 | asks it too, of the raw rows, to know whether a carousel is coming.
 |
 */
export function arrangement_of_count ( count: number ): Arrangement {
	if ( count <= 3 ) {
		return "ThreeInARow"
	}

	if ( count === 4 ) {
		return "Featured_Plus_ThreeInARow"
	}

	return "Carousel"
}

/**
 |
 | A plain row, stacked on a phone.
 |
 | **Each card keeps a third of the row however few there are.** One or two
 | cards leave the rest of the row empty, rather than stretching across it: a
 | lone card twice as wide as its neighbours on the next row would read as a
 | different kind of thing.
 |
 */
function ThreeInARow (
	{ normalise_colors, sessions, style_and_transition }: Arrangement_Props,
) {
	return <ul className={ ROW }>
		{ sessions.map( ( session ) =>
			<li key={ session.documentId }>
				<Card
					className="select-none"
					normalise_colors={ normalise_colors }
					session={ session }
					style_and_transition={ style_and_transition } />
			</li>
		) }
	</ul>
}

/**
 |
 | The same row, wrapping, with **the first card featured** — which from the
 | medium breakpoint upward turns it side-on, takes the whole width and shows
 | its standfirst. `card--featured` is a rule in
 | `tailwind-v3/components/card.css` and is already behind that breakpoint.
 |
 */
function Featured_Plus_ThreeInARow (
	{ normalise_colors, sessions, style_and_transition }: Arrangement_Props,
) {
	return <ul className={ `${ROW} flex-wrap` }>
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
						index === 0 ? "card--featured md:flex" : ""
					} select-none` }
					normalise_colors={ normalise_colors }
					session={ session }
					style_and_transition={ style_and_transition } />
			</li>
		) }
	</ul>
}

/**
 |
 | A looping row of cards, dragged, thrown or scrolled.
 |
 | **It runs out to the edges of the column holding it.** A loop that stopped
 | at the text margin would show its own ends, which is the one thing a loop is
 | for hiding. On a one-column page that column is the window; on a two-column
 | page it is the main column.
 |
 | **The viewport clips, so it is given room for the cards' shadows.** Padding
 | on every side of the track holds the shadow, and a negative margin of the
 | same size pulls the viewport back out by exactly as much, so the cards sit
 | where block spacing put them. The shadow is offset downward, so the room
 | below is the larger: its offset and blur need about 36px on a phone.
 |
 | One spacing for every carousel, whatever its category: two rows drawn by one
 | design must not sit at two heights.
 |
 */
function Carousel (
	{ normalise_colors, sessions, style_and_transition }: Arrangement_Props,
) {
	return <Looping_Track
		className={ `${use_column_bleed()} -mt-8 -mb-9 md:-mb-16 pt-8 pb-9 md:pb-16` }
		slide_className="w-73.5 md:w-5c">
		{ sessions.map( ( session ) =>
			<Card
				key={ session.documentId }
				className="select-none"
				normalise_colors={ normalise_colors }
				session={ session }
				style_and_transition={ style_and_transition } />
		) }
	</Looping_Track>
}

const ARRANGEMENTS: Record<Arrangement, ComponentType<Arrangement_Props>> = {
	Carousel,
	Featured_Plus_ThreeInARow,
	ThreeInARow,
}

/** The row both non-turning arrangements start from. */
const ROW =
	"mt-8 flex flex-col md:flex-row *:shrink-0 *:w-3c gap-4 md:*:w-4c md:gap-1g"
