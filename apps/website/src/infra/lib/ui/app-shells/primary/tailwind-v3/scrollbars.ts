
/**
 |
 | scrollbars — custom scrollbar utilities.
 |
 | `.scrollbar-none` hides the scrollbar while leaving the element scrollable
 | (wheel / trackpad / touch / keyboard all keep working). There is no single
 | cross-browser property for this, so it stacks the three mechanisms needed to
 | cover the project's target browsers (Safari 15, Firefox 92, Chrome 94):
 |
 |   • `scrollbar-width: none`    → Firefox. The standard property, but Chrome
 |                                  only gained it in 121 and Safari in 18.2, so
 |                                  it does NOT reach our Chrome/Safari targets.
 |   • `-ms-overflow-style: none` → legacy Edge / IE.
 |   • `::-webkit-scrollbar`      → Chrome & Safari — the only lever that reaches
 |                                  Chrome 94 and Safari 15. Nested as `&::…`
 |                                  because it's a pseudo-element on the scroll
 |                                  container itself (Tailwind's plugin engine
 |                                  resolves `&` natively).
 |
 | Registered as a plugin in `tailwind.config.ts`.
 |
 */

import plugin from "tailwindcss/plugin"

export const scrollbars_plugin = plugin( ( { addUtilities } ) => {
	addUtilities( {
		".scrollbar-none": {
			scrollbarWidth: "none",
			msOverflowStyle: "none",
			"&::-webkit-scrollbar": {
				display: "none",
			},
		},
	} )
} )
