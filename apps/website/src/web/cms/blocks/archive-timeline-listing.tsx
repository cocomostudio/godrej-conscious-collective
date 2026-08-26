
/**
 |
 | Archive timeline listing — a leaf. Every past edition on a spine.
 |
 | **Below the medium breakpoint it is a strip a visitor scrolls sideways**;
 | from it, a stack of rows. Both are the same ordered list with different
 | classes on it — no carousel library, no snapping and no drag handling,
 | because plain overflow scrolling is what the design asks for and what a
 | thumb already knows how to use. The same argument the vanilla carousel makes.
 |
 | `entries` is a **repeatable component list, not a region**: its members carry
 | no `__component`, so they arrive as raw data and this block draws them itself
 | rather than the renderer walking into them. What is *inside* an entry is a
 | region, and that does go back through the renderer — one level further down
 | than anything else in the catalogue reaches.
 |
 | # The spine's two fades
 |
 | The line down the timeline has to stop being a line at its first end, and it
 | fades rather than stopping square. Which direction it fades in depends on
 | which way the timeline is laid out, so there are two gradients — sideways
 | below the medium breakpoint and downward from it — and both are declared
 | here, on the list, because a row cannot know which end of the spine it is on
 | while a list can. They reach the rows as custom properties and are used by
 | `group-first`.
 |
 | The theme colour is read as an RGB triplet, which is how every colour in this
 | build is stored — the Tailwind tokens compile to `rgba(var(--token),
 | <alpha-value>)` and a gradient stop written any other way could not fade to
 | transparent without `color-mix()`, which the browser floor does not have.
 |
 | # The count
 |
 | The line above the timeline counts the entries rather than restating a number
 | somebody typed. The static site's is a literal that disagrees with its own
 | data; this one cannot.
 |
 */

import type { CSSProperties } from "react"

import type { Archive_Entry_Attribute } from "./archive-entry.tsx"

import { Archive_Entry } from "./archive-entry.tsx"
import { BLOCK_SPACING } from "./block-spacing.ts"

/** Transparent → the theme colour, in the two directions the design uses. */
const FADE_SIDEWAYS = [
	"to right",
	"rgba( var( --ctx-theme-color ), 0 )",
	"rgb( var( --ctx-theme-color ) )",
].join( ", " )

const FADE_DOWN = [
	"to bottom",
	"rgba( var( --ctx-theme-color ), 0 )",
	"rgb( var( --ctx-theme-color ) ) 50%",
].join( ", " )

export function Archive_Timeline_Listing (
	{ entries = [] }: { entries?: Archive_Entry_Attribute[] },
) {
	if ( entries.length === 0 ) {
		return null
	}

	return <div
		className={ BLOCK_SPACING }
		style={ {
			"--archive-spine-fade-down": FADE_DOWN,
			"--archive-spine-fade-sideways": FADE_SIDEWAYS,
		} as CSSProperties }>

		<List_Header className="md:hidden sticky top-0 z-40 -mx-1ccm" entries_count={ entries.length } />

		{
			/* The whole of the responsive behaviour is here. Below the medium
		     breakpoint: a horizontal strip, natively scrolled with its
		     scrollbar hidden, rows capped in width and overlapping slightly.
		     From it: `md:flex-wrap` turns every row full-width, which stacks
		     them. */
		}
		<ol className="flex max-md:overflow-auto max-md:scrollbar-none md:flex-wrap *:w-full *:max-w-89.5 md:*:max-w-none *:shrink-0 *:grow md:*:px-0 md:*:py-4 *-first:pt-0 *-last:pb-0 max-md:*-but-first:-ml-4">
			{ entries.map( ( entry, index ) =>
				<Archive_Entry entry={ entry } key={ index } />
			) }
		</ol>
	</div>
}

function List_Header ( { entries_count, className = "" }: { entries_count: number, className?: string } ) {
	/* **No rule above it.** The static site draws one to separate the
     sidebar's words from the timeline below on a phone, and the root
     block already draws exactly that rule for every two-column page
     whose sidebar is not repeated — see `root.tsx`. A second one here
     stacked two grey lines on top of each other. */

	/* One interpolation rather than three. React writes a comment
     between two adjacent expressions so that hydration can tell the
     text nodes apart, and "2<!-- --> <!-- -->Events" is a sentence
     nothing can search for. */

	return <div className={ `max-md:px-1ccm max-md:py-4 max-md:bg-gray-light ${ className }` }>
		<p className="text-h6 md:text-h3 md:font-semibold font-light text-theme md:text-black">
			{ `${entries_count} ${
				entries_count === 1 ? "Event" : "Events"
			}` }
		</p>
	</div>
}
