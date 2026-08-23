
/**
 |
 | Colours (Phase 2) — ported from the v4 `tailwind/colors.css`.
 |
 | v4 used `@theme` hex tokens, which made every opacity modifier compile to
 | `color-mix()` — unsupported on the target floor (Safari 15 / FF 92 / Chrome
 | 94). v3 instead stores each colour as an RGB-channel TRIPLET in a CSS var and
 | exposes the token as `rgba(var(--x), <alpha-value>)`, so `/opacity` modifiers
 | (e.g. `bg-gray-light/35`, `via-context/0`) emit plain `rgba()` — no
 | `color-mix()`. See the static site's docs/tailwind-v3-migration-handoff.md §5.3 / §5.5.
 |
 | Two groups:
 |   • Static palette — fixed brand/neutral colours. Their triplets are defined
 |     once here via `addBase` on `:root` (computed from hex with `hex-rgb`).
 |   • Context colours — themed per route. Their triplets are set inline on the
 |     route element (`--ctx-*-color`), so they are NOT defined here; the tokens
 |     below just reference those vars.
 |
 | NOTE: full-colour consumers of these vars (inline-style gradients in the
 | routes) wrap them as `rgb( var( --… ) )` now that the vars hold triplets, not
 | hex.
 |
 */

import hexRGB from "hex-rgb"
import plugin from "tailwindcss/plugin"

// User-provided helper: hex → "r, g, b" channel triplet (no alpha).
function get_rgb_channels ( hex_color_code: string ) {
	const { red, green, blue } = hexRGB( hex_color_code )
	return `${red}, ${green}, ${blue}`
}

// Static palette (hex from the v4 colors.css). Kept as hex here so the triplet
// math stays in one place (`get_rgb_channels`); the emitted CSS holds triplets.
const static_palette = {
	"black": "#1F1F1F",
	"white": "#FFFFFF",
	"gray-light": "#F5F5F5",
	"gray-dark": "#DFDFDF",
	"red": "#F44336",
	"green": "#00E1B6",
}

// Theme colour tokens. Each resolves to `rgba(<triplet>, <alpha-value>)`, so
// utilities and their `/opacity` modifiers compile to plain `rgba()`.
export const colors = {
	// Static palette → `--color-*` triplets defined by `colors_base_plugin`.
	"black": "rgba( var( --color-black ), <alpha-value> )",
	"white": "rgba( var( --color-white ), <alpha-value> )",
	"gray-light": "rgba( var( --color-gray-light ), <alpha-value> )",
	"gray-dark": "rgba( var( --color-gray-dark ), <alpha-value> )",
	"red": "rgba( var( --color-red ), <alpha-value> )",
	"green": "rgba( var( --color-green ), <alpha-value> )",

	// Context palette → `--ctx-*-color` triplets set inline per route.
	"theme": "rgba( var( --ctx-theme-color ), <alpha-value> )",
	"context": "rgba( var( --ctx-context-color ), <alpha-value> )",
	"showcase": "rgba( var( --ctx-showcase-color ), <alpha-value> )",
	"experience": "rgba( var( --ctx-experience-color ), <alpha-value> )",
	"conversation": "rgba( var( --ctx-conversation-color ), <alpha-value> )",
	"workshop": "rgba( var( --ctx-workshop-color ), <alpha-value> )",
	"collaborator": "rgba( var( --ctx-collaborator-color ), <alpha-value> )",
}

// Emits the static-palette triplets on `:root` (the v4 `@theme` hex tokens'
// replacement). Context-colour triplets are emitted inline by the routes.
export const colors_base_plugin = plugin( ( { addBase } ) => {
	const root_vars: Record<string, string> = {}
	for ( const [ name, hex ] of Object.entries( static_palette ) ) {
		root_vars[`--color-${name}`] = get_rgb_channels( hex )
	}
	addBase( { ":root": root_vars } )
} )
