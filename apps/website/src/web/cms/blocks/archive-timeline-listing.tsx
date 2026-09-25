
/**
 |
 | Archive timeline listing — a leaf. Every past edition on a spine.
 |
 | **Below the large breakpoint it is a strip a visitor scrolls sideways**;
 | from it, a stack of entries. Both are the same ordered list with different
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
 | below the large breakpoint and downward from it — and both are set
 | here, on the list, because an entry cannot know which end of the spine it is on
 | while a list can. They reach the entries as custom properties and are used by
 | `group-first`.
 |
 | The context colour is read as an RGB triplet, which is how every colour in
 | this build is stored — the Tailwind tokens compile to `rgba(var(--token),
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

import {
	Archive_Entry,
	FADE_DOWN,
} from "./archive-entry.tsx"
import {
	BLOCK_AT_A_SECTION_EDGE,
	BLOCK_SPACING,
} from "./block-spacing.ts"

/** Transparent → the context colour, for the strip. `FADE_DOWN` is the stack's. */
const FADE_SIDEWAYS = [
	"to right",
	"rgba( var( --ctx-context-color ), 0 )",
	"rgb( var( --ctx-context-color ) )",
].join( ", " )

export function Archive_Timeline_Listing (
	{ entries = [] }: { entries?: Archive_Entry_Attribute[] },
) {
	if ( entries.length === 0 ) {
		return null
	}

	// At a section edge the section left bare, the block keeps 32px of its own:
	// below itself at every width, and above itself from the large breakpoint.
	// Below it, the 32px above the strip sits under the count instead.
	return <div
		className={ `${BLOCK_SPACING} ${BLOCK_AT_A_SECTION_EDGE} lg:group-data-[flush-top]/section:first:pt-8 group-data-[flush-bottom]/section:last:pb-8` }
		style={ {
			"--archive-spine-fade-down": FADE_DOWN,
			"--archive-spine-fade-sideways": FADE_SIDEWAYS,
		} as CSSProperties }>
		<List_Header
			className="lg:hidden sticky top-0 z-[1] -mx-1ccm"
			entries_count={ entries.length } />

		{
			/* The whole of the responsive behaviour is here. Below the large
		     breakpoint: a horizontal strip, natively scrolled with its
		     scrollbar hidden, each entry three quarters of the screen wide up
		     to 400px, but never narrower than its widest part (the fan), and
		     overlapping the next slightly, 32px below the count.
		     From it: a column of full-width entries, 32px apart.

		     The list is a stacking context of its own, so that the count can
		     sit above everything in it and still below the site header, whose
		     shadow falls across the count. The count is `z-[1]` for that
		     reason: above the list, below the header's `z-10`.

		     From the large breakpoint the list keeps 32px of its own above
		     the first entry where the section laid none down, because the
		     first entry's line reaches 32px above that entry to fade out. */
		}
		<ol className="isolate flex max-lg:pt-8 max-lg:overflow-auto max-lg:scrollbar-none lg:flex-col lg:gap-8 max-lg:*:min-w-min max-lg:*:w-[75vw] max-lg:*:max-w-100 lg:*:w-full *:shrink-0 max-lg:*-but-first:-ml-4 lg:group-data-[flush-top]/section:group-first/block:pt-8">
			{ entries.map( ( entry, index ) =>
				<Archive_Entry entry={ entry } key={ index } />
			) }
		</ol>
	</div>
}

function List_Header (
	{ entries_count, className = "" }: {
		entries_count: number
		className?: string
	},
) {
	/* **No rule above it.** The static site draws one to separate the
     sidebar's words from the timeline below on a phone, and the root
     block already draws exactly that rule for every two-column page
     whose sidebar is not repeated — see `root.tsx`. A second one here
     stacked two grey lines on top of each other. */

	/* One interpolation rather than three. React writes a comment
     between two adjacent expressions so that hydration can tell the
     text nodes apart, and "2<!-- --> <!-- -->Events" is a sentence
     nothing can search for. */

	return <div
		className={ `max-lg:px-1ccm max-lg:py-4 max-lg:bg-gray-light ${className}` }>
		<p className="text-h6 lg:text-h3 lg:font-semibold font-light text-context lg:text-black">
			{ `${entries_count} ${entries_count === 1 ? "Event" : "Events"}` }
		</p>
	</div>
}
