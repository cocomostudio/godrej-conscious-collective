
/**
 |
 | Spacing scale (Phase 1) — ported from the v4 on-demand spacing engine.
 |
 | v3 cannot compute spacing on demand, so the numeric scale is GENERATED and
 | BOUNDED (0 → 400 in 0.25 steps). Anything beyond the ceiling uses arbitrary
 | `[…]` syntax in markup. See the static site's docs/tailwind-v3-migration-handoff.md §5.1.
 |
 | The grid tokens (`Nc`, `rNc`, `Ng`, `NcMg`, `Nccm`) reproduce the v4
 | `--spacing-*` formulas EXACTLY (see the dormant tailwind/layouts.css). They
 | reference `--column-width`, `--gutter-x` and `--cc-margin-width`, which are
 | defined later by the layout plugin (Phase 4); until then they resolve to
 | nothing, which is expected.
 |
 | These all land in `theme.extend.spacing`, so every spacing-derived utility
 | (width, height, size, padding, margin, gap, inset, min/max-width, …) picks
 | them up — e.g. `w-264`, `min-w-8c`, `pr-1g`, `w-1ccm`, `size-73.5`.
 |
 */

// 1 spacing unit ≡ 0.25rem (Tailwind's base multiplier; `4` → 1rem).
const base_rem = 0.25
// Granularity of the generated numeric scale.
const spacing_step = 0.25
// Ceiling kept modest so editor autocomplete stays responsive (§9).
const spacing_max = 400

// Column grid extents (12-column grid at md/lg; the tokens are defined up to
// the full set regardless of breakpoint, matching v4).
const max_columns = 12
const max_gutters = 11
const max_margins = 2

// Numeric scale: key N → `${ N * 0.25 }rem`, for N = 0, 0.25, 0.5, … 400.
function generate_numeric_spacing () {
	const step_count = Math.round( spacing_max / spacing_step )
	return Array.from( { length: step_count + 1 } ).reduce<
		Record<string, string>
	>(
		( scale, _unused, index ) => {
			const multiple = index * spacing_step
			scale[String( multiple )] = `${multiple * base_rem}rem`
			return scale
		},
		{},
	)
}

// Grid tokens — see CONTEXT.md for the column/gutter/margin vocabulary.
function generate_grid_spacing () {
	const tokens: Record<string, string> = {}

	// `Nc` — N columns, including the (N − 1) gutters between them.
	for ( let n = 1; n <= max_columns; n++ ) {
		tokens[`${n}c`] = `calc( ( ${n} * var( --column-width ) ) + ( ${
			n - 1
		} * var( --gutter-x ) ) )`
	}

	// `rNc` — N raw columns, gutters excluded.
	for ( let n = 1; n <= max_columns; n++ ) {
		tokens[`r${n}c`] = `calc( ${n} * var( --column-width ) )`
	}

	// `Ng` — N gutters.
	for ( let n = 1; n <= max_gutters; n++ ) {
		tokens[`${n}g`] = `calc( ${n} * var( --gutter-x ) )`
	}

	// `NcMg` — N columns + M extra gutters (total gutters = N − 1 + M).
	for ( let n = 1; n <= max_columns; n++ ) {
		for ( let m = 1; m <= max_gutters; m++ ) {
			tokens[`${n}c${m}g`] =
				`calc( ( ${n} * var( --column-width ) ) + ( ${
					n - 1 + m
				} * var( --gutter-x ) ) )`
		}
	}

	// `Nccm` — N content-container margins.
	for ( let n = 1; n <= max_margins; n++ ) {
		tokens[`${n}ccm`] = n === 1
			? `var( --cc-margin-width )`
			: `calc( ${n} * var( --cc-margin-width ) )`
	}

	return tokens
}

export const spacing = {
	...generate_numeric_spacing(),
	...generate_grid_spacing(),
}
