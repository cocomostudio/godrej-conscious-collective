
/**
 |
 | The gap a block leaves around itself.
 |
 | One string in one place, because every leaf and composite in the catalogue
 | uses it and a section's children are a mixed bag of them — a block that
 | spaced itself differently would read as a mistake rather than as a choice.
 |
 | It collapses at the ends: a block that opens or closes a region leaves the
 | outer gap to whatever contains it, which for a section is padding. A few
 | listings keep a gap of their own where the section laid none down — see
 | `PADDING_AT_A_FLUSH_EDGE` below.
 |
 | **A handful of blocks let an editor say otherwise**, through a
 | `spacing_around` attribute the schema gives them. `block_spacing` turns that
 | value into the same two halves, and `wants_space_above` / `wants_space_below`
 | answer the half of the question a *section* has to ask before it lays down
 | padding a block at its edge does not want. A block cannot undo that padding
 | from inside — a negative margin on a child is clamped at the padding box — so
 | the section asks first and does not lay it down. See `section-frame.tsx`.
 |
 */

const ABOVE = "mt-6 md:mt-8 first:mt-0"
const BELOW = "mb-6 md:mb-8 last:mb-0"

export const BLOCK_SPACING = `${ABOVE} ${BELOW}`

/**
 |
 | **The marks a section leaves on itself where it laid down no padding**, and
 | the group name a block reads them through.
 |
 | A section that declines its padding at an edge says so on its own element,
 | with one data attribute per declined edge. A block at that edge cannot
 | otherwise tell whether the space above or below it went, because the
 | section's decision is padding on an ancestor and CSS reads nothing upward.
 |
 | The names live here rather than in `section-frame.tsx` because the class
 | below is what reads them, and a class is a string Tailwind has to see
 | whole: the variant names the attribute and the group by their literal
 | spelling, so the spelling is fixed here beside it.
 |
 */
export const SECTION_GROUP = "group/section"
export const FLUSH_TOP_MARK = "data-flush-top"
export const FLUSH_BOTTOM_MARK = "data-flush-bottom"

/**
 |
 | **The gap a listing keeps at a section's edge where the section laid none
 | down.** Two blocks ask for it — the category pages' filtration listing and
 | the collaborators grid. Each opens a page with a header of its own, and a
 | header hard against the top of the column is not the design, whatever the
 | section decided. From the medium breakpoint they keep 32px there.
 |
 | **It is padding, and it goes on the box that carries the paint**, which is
 | the same rule a section follows and for the same reason. A margin here
 | collapses straight out through the section, because a section that declined
 | its padding has none at that edge to stop it: the whole section moves down
 | instead, and what fills the gap is the grey behind the column rather than
 | the listing's own colour. Padding cannot collapse, and padding inside the
 | painted box puts the gap *within* the colour, so the colour still reaches
 | the edge of the column and the header sits 32px into it.
 |
 | Two classes, because the box that paints is not always the box that sits at
 | the edge. `BLOCK_AT_A_SECTION_EDGE` names the outer one, whose position
 | among its siblings is what "at the edge" means; `PADDING_AT_A_FLUSH_EDGE`
 | goes on the painted box inside it and reads both that position and the
 | section's mark.
 |
 */
export const BLOCK_AT_A_SECTION_EDGE = "group/block"

export const PADDING_AT_A_FLUSH_EDGE = [
	"md:group-data-[flush-top]/section:group-first/block:pt-8",
	"md:group-data-[flush-bottom]/section:group-last/block:pb-8",
].join( " " )

/**
 |
 | What an unset `spacing_around` means, and what every block without the
 | attribute at all is treated as: a gap on both sides.
 |
 */
const NORMAL = "normal"

export type Spacing_Around = string | null | undefined

/**
 |
 | **A missing value is `normal`, and `null` is a missing value.**
 |
 | A schema default is applied when a row is written, not when one is read, so
 | every entry saved before a component gained the attribute comes back with
 | `null` in it — and a default parameter would not catch that, because `null`
 | is a value a caller passed. Reading it as "no spacing" would silently
 | collapse the padding around every block on every page that predates the
 | attribute, which is the whole catalogue.
 |
 */
function asked_for ( spacing_around: Spacing_Around ) {
	return spacing_around ?? NORMAL
}

export function wants_space_above ( spacing_around: Spacing_Around ) {
	const asked = asked_for( spacing_around )

	return asked === NORMAL || asked === "above"
}

export function wants_space_below ( spacing_around: Spacing_Around ) {
	const asked = asked_for( spacing_around )

	return asked === NORMAL || asked === "below"
}

/**
 |
 | The block spacing an editor asked for, as classes.
 |
 | `normal` is `BLOCK_SPACING` exactly, so a block that gains the attribute
 | keeps looking the way it did until somebody changes the value.
 |
 */
export function block_spacing ( spacing_around: Spacing_Around ) {
	return [
		wants_space_above( spacing_around ) ? ABOVE : "",
		wants_space_below( spacing_around ) ? BELOW : "",
	].filter( Boolean ).join( " " )
}
