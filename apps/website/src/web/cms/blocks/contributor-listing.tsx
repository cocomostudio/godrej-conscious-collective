
/**
 |
 | Collaborator listing — a leaf. The people taking part, in one of three
 | arrangements an editor picks between.
 |
 |   • **natural** — a plain row that wraps. No measuring, no scripting, no
 |     scrolling: what the browser does with a row of pictures on its own.
 |   • **carousel** — the home page's turning ring, where the middle portrait
 |     swells and its neighbours drop away beneath it.
 |   • **grid** — the collaborators page, three across, filling the width.
 |
 | **The rows arrive already chosen.** An editor who wants a particular five
 | drags them in; an editor who leaves the relation empty gets the people
 | belonging to the event this page resolved to. The CMS settles which, and this
 | block cannot tell — the same rows, in the same shape, either way.
 |
 | As with the session listing, the heading, the opening line and the "View All"
 | link belong to the **section** that holds this.
 |
 */

import type {
	ComponentType,
	CSSProperties,
} from "react"

import type { Contributor_Card } from "../envelope.ts"

import { Portrait } from "../cards.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"
import { Contributor_Carousel } from "./contributor-carousel.tsx"

const LAYOUT_NAMES = [ "natural", "carousel", "grid" ] as const

type Contributor_Layout = typeof LAYOUT_NAMES[number]

type Contributor_Listing_Props = {
	layout?: Contributor_Layout
	contributors?: Contributor_Card[]
}

export function Contributor_Listing (
	{ contributors = [], layout }: Contributor_Listing_Props,
) {
	if ( contributors.length === 0 ) {
		return null
	}

	// A fourth arrangement added to the CMS before it is added here costs a
	// visitor the plainest of the three rather than costing them the row.
	const Rendering = LAYOUTS[layout as Contributor_Layout] ?? Natural

	// **Which of the three takes the section's full width is the
	// arrangement's own business**, and the carousel takes it for the ring
	// alone — its pagination stays lined up with the grid. So the escape is
	// applied inside that arrangement rather than around all three here.
	return <div className={ BLOCK_SPACING }>
		<Rendering contributors={ contributors } />
	</div>
}

type Layout_Props = { contributors: Contributor_Card[] }

/**
 |
 | Natural: a row of portraits at their own size, wrapping when they run out of
 | width. The arrangement with nothing in it — which is the point of offering
 | it, because two of the three below are machinery.
 |
 */
function Natural ( { contributors }: Layout_Props ) {
	return <ul className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8">
		{ contributors.map( ( person ) =>
			<li
				className="w-42.5 md:w-56"
				key={ person.documentId }>
				<Portrait contributor={ person } />
			</li>
		) }
	</ul>
}

/**
 |
 | Grid: three across from the medium breakpoint, and as many as fit below it.
 |
 | The template is the static site's own, and it is `auto-fit` with a floor
 | rather than a fixed column count: a listing of four should not leave one
 | portrait stranded on a row of its own at every width.
 |
 */
function Grid ( { contributors }: Layout_Props ) {
	return <ul
		className="grid md:grid-cols-3 gap-x-[--gap-x] gap-y-8"
		style={ {
			"--gap-x": "2rem",
			gridTemplateColumns: `repeat(
				auto-fit,
				minmax(
					max(
						( 100% - 2 * var( --gap-x ) ) / 3,
						min( 10.1875rem, 100% - var( --gap-x ) )
					),
					1fr
				)
			)`,
		} as CSSProperties }>
		{ contributors.map( ( person ) =>
			<li key={ person.documentId }>
				<Portrait className="mx-auto" contributor={ person } />
			</li>
		) }
	</ul>
}

const LAYOUTS: Record<Contributor_Layout, ComponentType<Layout_Props>> = {
	carousel: Contributor_Carousel,
	grid: Grid,
	natural: Natural,
}
