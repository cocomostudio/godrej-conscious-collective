
/**
 |
 | remove-default-style (Phase 5) — ported from the v4
 | `tailwind/remove-default-styles.css`.
 |
 | A `<summary>`-targeting utility: strips the disclosure marker and adds a
 | keyboard focus ring. Ported as `addUtilities`; the v4 `&:is( summary )` nesting
 | maps directly onto nested `&` selectors in the plugin object (Tailwind's plugin
 | engine resolves `&` natively, so no PostCSS nesting plugin is needed).
 |
 | See the static site's docs/tailwind-v3-migration-handoff.md §5.6 / §7 (Phase 5).
 |
 */

import plugin from "tailwindcss/plugin"

export const remove_default_styles_plugin = plugin( ( { addUtilities } ) => {
	addUtilities( {
		".remove-default-style": {
			"&:is( summary )": {
				listStyle: "none",
				cursor: "pointer",
			},
			"&:is( summary )::-webkit-details-marker": {
				display: "none",
			},
			"&:is( summary )::marker": {
				content: "\"\"",
			},
			"&:is( summary ):focus-visible": {
				outline: "2px solid currentColor",
				outlineOffset: "2px",
			},
		},
	} )
} )
