
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
 | One way out of the frame:
 |
 |   • **`use_full_bleed`** takes a block back out to the section's full width.
 |     A listing drawn as a carousel needs it, because it loops and has to run
 |     off both edges rather than stop at a margin and show its own ends. It is
 |     a one-column page's alone: there, the section *is* the full width.
 |
 | And one question a section asks before it frames anything: **whether to pad
 | at the top, and whether to pad at the bottom.** Padding is undone where it is
 | laid down and nowhere else — a negative margin on a child is clamped at the
 | padding box — so a block that means to sit flush against a section's edge
 | cannot arrange it from inside. The section asks its own `spacing_around` and
 | its edge blocks' first, and the space goes if either declines it.
 |
 */

import type { Spacing_Around } from "./block-spacing.ts"

import {
	wants_space_above,
	wants_space_below,
} from "./block-spacing.ts"
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

type Section_Padding = {
	horizontal_rule: boolean
	one_column: boolean
	pad_bottom: boolean
	pad_top: boolean
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
	{ horizontal_rule, one_column, pad_bottom, pad_top }: Section_Padding,
) {
	const bottom = pad_bottom
		? ( one_column ? "pb-12 md:pb-16" : "pb-6 md:pb-8" )
		: ""

	if ( !pad_top ) {
		return bottom
	}

	if ( horizontal_rule ) {
		return `pt-3 md:pt-4 ${bottom}`
	}

	return `${one_column ? "pt-12 md:pt-16" : "pt-6 md:pt-8"} ${bottom}`
}

type Section_Edges = {
	/**
	 |
	 | The section's own region, unrendered. Read for the `spacing_around` of
	 | the blocks at its two ends, which a rendered region cannot answer — that
	 | is an array of nodes with no blocks behind them.
	 |
	 */
	content: unknown
	/** Whether the section shows a heading, an opening line or a link. */
	has_words: boolean
	/** The section's own `spacing_around`. */
	spacing_around?: Spacing_Around
}

/**
 |
 | Whether this section lays down padding at its top.
 |
 | Its own `spacing_around` first, and then its first block's — but the block's
 | only counts where nothing of the section's own sits above it. A section with
 | a heading has words at the top edge, and those need the space whatever the
 | block beneath them asked for.
 |
 */
export function pads_at_top (
	{ content, has_words, spacing_around }: Section_Edges,
) {
	if ( !wants_space_above( spacing_around ) ) {
		return false
	}

	if ( has_words ) {
		return true
	}

	return wants_space_above( edge_block( content, "first" )?.spacing_around )
}

/**
 |
 | Whether this section lays down padding at its bottom.
 |
 | Nothing of the section's own is ever drawn below its blocks, so there is no
 | equivalent of the `has_words` reprieve here: the last block is at the edge.
 |
 */
export function pads_at_bottom ( { content, spacing_around }: Section_Edges ) {
	return wants_space_below( spacing_around )
		&& wants_space_below( edge_block( content, "last" )?.spacing_around )
}

type Spaced_Block = Block & { spacing_around?: Spacing_Around }

function edge_block (
	content: unknown,
	end: "first" | "last",
): Spaced_Block | undefined {
	if ( !Array.isArray( content ) || content.length === 0 ) {
		return undefined
	}

	return end === "first" ? content[0] : content[content.length - 1]
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
