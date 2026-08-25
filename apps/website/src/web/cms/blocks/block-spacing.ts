
/**
 |
 | The gap a block leaves around itself.
 |
 | One string in one place, because every leaf and composite in the catalogue
 | uses it and a section's children are a mixed bag of them — a block that
 | spaced itself differently would read as a mistake rather than as a choice.
 |
 | It collapses at the ends: a block that opens or closes a region leaves the
 | outer gap to whatever contains it, which for a section is padding.
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
