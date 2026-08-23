
/**
 |
 | Layout & grid (Phase 4) — ported from the v4 `tailwind/layouts.css`.
 |
 | v4 expressed the content-container/column system with `@layer base`/`@theme`
 | custom properties and `@utility`/`@variant` blocks. v3 reproduces it as a
 | plugin:
 |   • `addBase` emits the container/grid CSS vars on `:root` — the static base
 |     plus the md/lg/xl responsive overrides inside `@media (min-width: …)`
 |     blocks (driven off `screens`), reproducing the v4 `@variant` reassignment.
 |   • `addComponents` registers the `cc` content-container utility and the 1:4
 |     two-column layout (`layout__1-4__col-1/2`). Both are eligible for variants
 |     in v3 JIT, so `md:cc` (used in markup) still compiles.
 |
 | The grid spacing tokens (`Nc`, `rNc`, `Ng`, `NcMg`, `Nccm`) defined in
 | `spacing.ts` consume `--column-width`, `--gutter-x` and `--cc-margin-width`,
 | which are defined here — so e.g. `min-w-8c`, `pr-1g`, `w-1ccm` resolve once
 | this plugin is wired in.
 |
 | The `--100vw` var keeps its `100vw` fallback; it is meant to be recomputed in
 | JS (see `src/lib/react/page-properties/scrollbar-breadth.tsx`, which captures
 | the scrollbar breadth). That wiring is untouched.
 |
 | See the static site's docs/tailwind-v3-migration-handoff.md §5.6 / §7 (Phase 4).
 |
 */

import plugin from "tailwindcss/plugin"

import { screens } from "./screens.ts"

export const layouts_plugin = plugin( ( { addBase, addComponents } ) => {
	addBase( {
		":root": {
			// Accurately recomputed in JS and re-assigned (scrollbar-breadth).
			"--100vw": "100vw",

			// Symmetry is prioritised over space utilisation: if one unsafe area
			// is wider than the other, we take the larger of the two. (The v4
			// source kept a `0` fallback declaration for browsers without
			// `env()`/`max()`; both are supported across our target floor, so the
			// functional value alone suffices.)
			"--safe-margin-x":
				"max( env( safe-area-inset-left, 0px ), env( safe-area-inset-right, 0px ) )",

			// Margin width is static at the base; max width is dynamic.
			"--cc-margin-width": "max( 1rem, var( --safe-margin-x ) )",
			"--cc-max-width":
				"calc( var( --100vw ) - ( 2 * var( --cc-margin-width ) ) )",

			// Column count + gutter per breakpoint (sm → 3 cols, md/lg/xl → 12).
			// Wrapped in min-width media so they only apply from the sm floor up,
			// matching the v4 `@variant sm/md/lg` blocks.
			[`@media (min-width: ${screens.sm})`]: {
				"--columns": "3",
				"--gutter-x": "1rem",
			},

			// Single column width — recomputes through the cascade as its inputs
			// (--cc-max-width / --columns / --gutter-x) change per breakpoint.
			"--column-width":
				"calc( ( var( --cc-max-width ) - ( ( var( --columns ) - 1 ) * var( --gutter-x ) ) ) / var( --columns ) )",

			// md: the grid now has 12 columns
			// container stays fluid; margins fix at 4rem and the width
			// tracks the viewport (`100vw - 2 * 4rem`), so the container grows
			// with the screen rather than sitting at a static cap.
			[`@media (min-width: ${screens.md})`]: {
				"--cc-max-width": "calc( var( --100vw ) - ( 2 * 4rem ) )",
				"--cc-margin-width": "max( var( --safe-margin-x ), 4rem )",
				"--columns": "12",
				"--gutter-x": "2rem",
			},

			// lg: things stay the same

			// xl: max width becomes static again at the 1440px design width and
			// the container re-centres (margin width back to dynamic).
			[`@media (min-width: ${screens.xl})`]: {
				"--cc-max-width": "calc( 1440px - ( 2 * 4rem ) )",
				"--cc-margin-width":
					"max( var( --safe-margin-x ), ( var( --100vw ) - var( --cc-max-width ) ) / 2 )",
				"--columns": "12",
				"--gutter-x": "2rem",
			},
		},
	} )

	addComponents( {
		// Content container — full width, capped at the responsive max width.
		".cc": {
			width: "100%",
			maxWidth: "var( --cc-max-width )",
		},

		// 1:4 two-column layout (md+).
		// Column 1 = left margin + 3 columns + 1 additional gutter (= 3 gutters).
		".layout__1-4__col-1": {
			[`@media (min-width: ${screens.md})`]: {
				flexGrow: "0",
				flexShrink: "0",
				flexBasis:
					"calc( var( --cc-margin-width ) + ( 3 * var( --column-width ) ) + ( 3 * var( --gutter-x ) ) )",
				// `@apply pr-1g` → 1 gutter of right padding.
				paddingRight: "calc( 1 * var( --gutter-x ) )",
			},
		},
		// Column 2 = the remaining flexible track.
		".layout__1-4__col-2": {
			[`@media (min-width: ${screens.md})`]: {
				flexGrow: "1",
				flexShrink: "1",
				flexBasis: "0",
				minWidth: "0",
			},
		},
	} )
} )
