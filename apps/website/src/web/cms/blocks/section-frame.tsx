
/**
 |
 | How a section frames what is inside it, and how a block gets out of that
 | frame.
 |
 | **The frame only exists on a one-column page.** There, the section runs the
 | full width of the document — that is what a one-column page is for — and the
 | twelve-column container is introduced *inside* it, centred, so that the words
 | line up with the grid instead of with the window. On a two-column page the
 | main column is already the container, and a second one inside every section
 | would narrow the page a second time.
 |
 | Two ways out of the frame, because there are two frames:
 |
 |   • **`use_full_bleed`** takes a block back out to the section's full width.
 |     A listing drawn as a carousel needs it, because it loops and has to run
 |     off both edges rather than stop at a margin and show its own ends.
 |
 |   • **`sheds_padding`** is asked by the section itself, before it pads
 |     anything. The ticker butts straight against whatever sits above and
 |     below it, and a block cannot undo padding from inside it: a negative
 |     margin on the child is clamped at the padding box and leaves the space
 |     behind. So the section that holds nothing but such a block does not lay
 |     the padding down in the first place.
 |
 */

import { use_page_layout } from "../page-layout.tsx"

import type { Block } from "../envelope.ts"

/** The twelve-column container, centred, that a one-column section introduces. */
export const SECTION_CONTAINER = "cc mx-auto"

/**
 |
 | Out of the container and back to the section's own width.
 |
 | One content-container margin on each side is exactly what `cc mx-auto`
 | leaves beside itself, so this returns a block to the full width of the
 | section holding it.
 |
 */
const FULL_BLEED = "-mx-1ccm"

/**
 |
 | The blocks that leave no space around themselves at all.
 |
 | One entry, and it should stay short: a block belongs here only when the
 | design has it touching its neighbours on both edges, which is a statement
 | about the whole section rather than about the block.
 |
 */
const PADDING_FREE = new Set( [ "text.marquee-v1" ] )

type Section_Padding = {
	horizontal_rule: boolean
	one_column: boolean
}

/**
 |
 | A section that draws a rule above itself sits closer to the one before it:
 | the line is already doing the separating, and the full gap on top of it reads
 | as a stranded rule rather than as a division.
 |
 | Padding is greater on a one-column page than on a two-column one: a
 | one-column page has the whole width and the design opens it up to match.
 |
 */
export function section_padding (
	{ horizontal_rule, one_column }: Section_Padding,
) {
	const bottom = one_column ? "pb-12 md:pb-16" : "pb-6 md:pb-8"

	if ( horizontal_rule ) {
		return `pt-3 md:pt-4 ${bottom}`
	}

	return `${one_column ? "pt-12 md:pt-16" : "pt-6 md:pt-8"} ${bottom}`
}

/**
 |
 | Whether this section should lay down no padding at all.
 |
 | Only when **everything** in it is padding-free and it shows nothing of its
 | own above them. A section with a heading, an opening line or a link has words
 | that need the space, and a section holding a ticker beside anything else has
 | the other thing to keep off its neighbours.
 |
 | It is asked of the section's own attributes rather than of what came back
 | rendered, because a rendered region is opaque — an array of nodes with no
 | block behind them — and the question is about which blocks are there.
 |
 */
export function sheds_padding (
	{ content, has_words }: { content: unknown; has_words: boolean },
) {
	if ( has_words || !Array.isArray( content ) || content.length === 0 ) {
		return false
	}

	return content.every( ( block: Block ) =>
		PADDING_FREE.has( block?.__component )
	)
}

/**
 |
 | The class that takes a block out to the section's full width.
 |
 | Empty on a two-column page, where there is no container of the section's to
 | escape and the margins would drag the block out into the sidebar.
 |
 */
export function use_full_bleed () {
	return use_page_layout() === "one-column" ? FULL_BLEED : ""
}
