
/**
 |
 | Tailwind CSS v3 configuration (PostCSS-driven).
 |
 | Lifted intact from the static site. It is authored as a thin composition
 | layer: each concern (spacing, colours, typography, layout/grid, backgrounds,
 | components, variants) is a modular plugin/theme fragment wired in here.
 |
 | Tailwind stays on v3 deliberately. The browser floor is Safari 15, Firefox 92
 | and Chrome 94; Tailwind 4 requires `@property`, `color-mix()`, native
 | `@layer` and `oklch()`, none of which that floor has.
 |
 | See decision record
 | docs/decisions/00005-tailwind-stays-on-v3-for-the-browser-floor.md
 |
 */

import type { Config } from "tailwindcss"

import { spacing } from "./spacing.ts"
import { selectors_plugin } from "./selectors.ts"
import { state_variants_plugin } from "./state-variants.ts"
import { screens } from "./screens.ts"
import { screens_height_plugin } from "./screens-height.ts"
import { webkit_plugin } from "./webkit.ts"
import { aspect_ratio } from "./aspect-ratio.ts"
import { transition_delay, transition_duration } from "./transitions.ts"
import { translate } from "./translate.ts"
import { z_index } from "./z-index.ts"
import { border_width } from "./border-width.ts"
import { colors, colors_base_plugin } from "./colors.ts"
import { font_family, font_size, typography_base_plugin } from "./typography.ts"
import { layouts_plugin } from "./layouts.ts"
import { backgrounds_plugin } from "./backgrounds.ts"
import { remove_default_styles_plugin } from "./remove-default-styles.ts"
import { gradients_plugin } from "./gradients.ts"
import { scrollbars_plugin } from "./scrollbars.ts"

const config: Config = {
	// Content scanning is resolved relative to the cwd of the build
	// (`apps/website`).
	content: {
		files: [
			"./src/**/*.{ts,tsx}",
		],
	},

	theme: {
		// Replace the default breakpoints with the project's three.
		screens,

		extend: {
			// Theme scales.
			spacing,
			aspectRatio: aspect_ratio,
			transitionDuration: transition_duration,
			transitionDelay: transition_delay,
			translate,
			zIndex: z_index,
			borderWidth: border_width,

			// Colours — rgba + <alpha-value> over RGB-triplet vars, so opacity
			// modifiers never emit color-mix().
			colors,

			// Typography — fontSize tokens → vars; Public Sans stack.
			fontSize: font_size,
			fontFamily: font_family,
		},
	},

	plugins: [
		selectors_plugin,
		// `peer-checked-deep:` / `peer-focus-visible-deep:` — peer state that
		// crosses into descendants of a sibling. Needed by the header's no-JS
		// mobile nav; stock `peer-*` is sibling-only.
		state_variants_plugin,
		// Height-aware screen variants (`tall:`). Kept out of theme.screens —
		// see the warning block in screens.ts.
		screens_height_plugin,
		// `webkit:` / `ios-webkit:` (+ `not-` twins) — @supports feature-query
		// hacks that match only WebKit / only iOS WebKit.
		webkit_plugin,
		// Colours: addBase RGB-triplet static palette on :root.
		colors_base_plugin,
		// Typography: addBase base + lg responsive --text-* vars.
		typography_base_plugin,
		// Layouts: container/grid vars (addBase) + cc & 1:4 layout
		// (addComponents). card (components/card.css) is a plain-CSS partial
		// imported by index.css, not a plugin.
		layouts_plugin,
		// Mesh-gradient backgrounds + remove-default-style utilities.
		backgrounds_plugin,
		remove_default_styles_plugin,
		// bg-linear-to-* direction aliases (from/via/to are native v3.4).
		gradients_plugin,
		// scrollbars — `.scrollbar-none` (hides the scrollbar, stays scrollable).
		scrollbars_plugin,
	],
}

export default config
