
/**
 |
 | How a section frames what is inside it, and how a block gets out of that
 | frame.
 |
 | **A section is always the full width of the column it is in, and always
 | introduces its own container inside that.** That is what lets its background
 | reach the column's edges while its words stay on the grid — the background is
 | painted by the section, and the container is a box inside it.
 |
 | What the column is differs between the two arrangements, and so does what the
 | container has to be. On a one-column page the column is the document, and the
 | container is the twelve-column one, centred. On a two-column page the column
 | is the white box in `root.tsx` — nine columns and two gutters — and the
 | container is padding: the main column's `md:pl-16` inset on the left, and the
 | two gutters the box holds beyond the words on the right. `section_container`
 | answers for both.
 |
 | Padding rather than a second centred container, because the two are not the
 | same thing from inside. A `cc mx-auto` would re-answer what `100%` means to
 | every block below it; padding leaves the content box exactly the width it was
 | when the main column drew the container itself.
 |
 | Two ways out of the frame, because there are two frames:
 |
 |   • **`use_full_bleed`** takes a block back out to the section's full width.
 |     A listing drawn as a carousel needs it, because it loops and has to run
 |     off both edges rather than stop at a margin and show its own ends. It is
 |     a one-column page's alone: there, the section *is* the full width.
 |
 |   • **`use_column_bleed`** takes a block out to the edges of the white
 |     column, whichever arrangement the page is in. On a one-column page that
 |     is the same answer — the window's edges. On a two-column page it is the
 |     main column's own edges: out of the `md:pl-16` inset on the left, and
 |     across the two gutters the white box holds beyond the container on the
 |     right. The full-bleed image is what asks.
 |
 | And one way back in: **`use_column_inset`** is the padding that returns a
 | block's content to where an ordinary block's would have been, for a block
 | that wanted only its background out at the edges.
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
const SECTION_CONTAINER = "cc mx-auto"

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
 | Out to the edges of the white column on a two-column page.
 |
 | Below the medium breakpoint the column is the window, so it is the same
 | margin the one-column answer uses. From there up the section is inset by
 | `md:pl-16` on the left, which `-ml-16` gives back, and it holds two gutters
 | of padding on the right beyond where its words stop, which `-mr-2g` gives
 | back. See `COLUMN_BLEED_INSET` below, of which this is the exact mirror, and
 | `root.tsx`, where the box those two describe is drawn.
 |
 */
const COLUMN_BLEED = "-ml-1ccm md:-ml-16 -mr-1ccm md:-mr-2g"

/**
 |
 | The two bleeds again, as the padding that gives each of them back.
 |
 | Each is the mirror of the margins above it — one content-container margin
 | on a one-column page; the column's own inset and the white box's two
 | gutters on a two-column one — so a box carrying one of these sits exactly
 | where it would have sat had neither been applied.
 |
 */
const FULL_BLEED_INSET = "px-1ccm"
const COLUMN_BLEED_INSET = "pl-1ccm md:pl-16 pr-1ccm md:pr-2g"

/**
 |
 | The container a section introduces inside itself, so that its background can
 | be the full width of the column while its words are not.
 |
 | A centred twelve-column container on a one-column page; the main column's own
 | inset, as padding, on a two-column one. The two-column answer is
 | `COLUMN_BLEED_INSET` itself rather than a copy of it: what a section lays
 | down here is exactly what `use_column_bleed` takes back out, which is the
 | whole reason a bleeding block needs no arithmetic of its own.
 |
 */
export function section_container ( { one_column }: { one_column: boolean } ) {
	return one_column ? SECTION_CONTAINER : COLUMN_BLEED_INSET
}

/**
 |
 | The same inset for the rule drawn *between* two sections, which is a sibling
 | of the section rather than a child and so is framed by nothing.
 |
 | Empty on a one-column page, where the rule runs the full width of the
 | document — it separates two full-width sections, and stopping at the grid
 | would read as a rule belonging to one of them.
 |
 */
export function section_rule_inset ( { one_column }: { one_column: boolean } ) {
	return one_column ? "" : COLUMN_BLEED_INSET
}

type Section_Padding = {
	one_column: boolean
	pad_bottom: boolean
	pad_top: boolean
}

/**
 |
 | Padding is greater on a one-column page than on a two-column one: a
 | one-column page has the whole width and the design opens it up to match.
 | 48px and 64px there, 24px and 32px here.
 |
 | **A section's rule does not enter into it.** It used to: `horizontal_rule`
 | once bought a `pt-3 md:pt-4` here. That value came from the static site's
 | session page, where it is the top half of the tight `pb-3` / `pt-3` pair that
 | page gives *every* section in its stack — the two sections with no rule
 | between them carry it too, and the rules there hold their own margins rather
 | than lean on a neighbour's padding. It was read as belonging to the rule and
 | wired to the flag, and it has been the site-wide norm ever since. A rule
 | separates; it does not space.
 |
 */
export function section_padding (
	{ one_column, pad_bottom, pad_top }: Section_Padding,
) {
	const bottom = pad_bottom
		? ( one_column ? "pb-12 md:pb-16" : "pb-6 md:pb-8" )
		: ""

	if ( !pad_top ) {
		return bottom
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

/**
 |
 | The class that takes a block out to the edges of the column it is in.
 |
 | Unlike `use_full_bleed` this answers on both arrangements, because both have
 | a column with edges — the window on a one-column page, and the white box in
 | the second column on a two-column one.
 |
 */
export function use_column_bleed () {
	return use_page_layout() === "one-column" ? FULL_BLEED : COLUMN_BLEED
}

/**
 |
 | The padding that undoes `use_column_bleed`.
 |
 | **A block that paints to the column's edges but sets its words where an
 | ordinary block's words are needs both**: the bleed on the box carrying the
 | paint, and this on a box inside it. The filtration listing is the case —
 | its gradient runs the width of the column and its cards do not.
 |
 | It reads the arrangement for the same reason the bleed does: what was taken
 | differs between the two, so what is given back has to differ with it. A
 | block that wrote the two-column answer out by hand would inset itself past
 | the margin on a one-column page, where there is no `md:pl-16` to give back.
 |
 */
export function use_column_inset () {
	return use_page_layout() === "one-column"
		? FULL_BLEED_INSET
		: COLUMN_BLEED_INSET
}
