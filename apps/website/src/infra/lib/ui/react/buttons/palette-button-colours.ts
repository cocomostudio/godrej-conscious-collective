
/**
 |
 | The classes that draw a button in the theme or in the context colour.
 |
 | Both button primitives draw these two colours from the event's own button
 | colours — twelve per palette colour — rather than from the one base colour,
 | so a button responds to a pointer and to a press in whatever colours the
 | event was given. See `tailwind-v3/colors.ts` for the tokens.
 |
 | **Hover colours are behind `can-hover`**, so a tap on a phone does not leave
 | a button stuck in its hover colour. **Pressed colours are written twice**:
 | once plain, for a touch, and once behind `can-hover` too, because a mouse
 | pressing a button is also hovering it, and a variant behind a media query is
 | emitted after a plain one — the pressed colour would otherwise lose to the
 | hover colour at the one moment it is meant to show.
 |
 | Every class is written out whole, because Tailwind compiles only the class
 | names it can find in the source.
 |
 */

export const PALETTE_BUTTON_COLOURS = {
	outline: {
		context: [
			"border-context-outline-border",
			"can-hover:hover:border-context-outline-border-hover",
			"active:border-context-outline-border-active",
			"can-hover:active:border-context-outline-border-active",
			"text-context-outline-text",
			"can-hover:hover:text-context-outline-text-hover",
			"active:text-context-outline-text-active",
			"can-hover:active:text-context-outline-text-active",
		].join( " " ),
		theme: [
			"border-theme-outline-border",
			"can-hover:hover:border-theme-outline-border-hover",
			"active:border-theme-outline-border-active",
			"can-hover:active:border-theme-outline-border-active",
			"text-theme-outline-text",
			"can-hover:hover:text-theme-outline-text-hover",
			"active:text-theme-outline-text-active",
			"can-hover:active:text-theme-outline-text-active",
		].join( " " ),
	},
	/**
	 |
	 | White words on the fill, except where the context colour is white —
	 | which the context alias answers for with a text colour of its own. The
	 | theme is always a palette colour, so its words are always white.
	 |
	 */
	solid: {
		context: [
			"border-context-solid-border",
			"can-hover:hover:border-context-solid-border-hover",
			"active:border-context-solid-border-active",
			"can-hover:active:border-context-solid-border-active",
			"bg-context-solid-fill",
			"can-hover:hover:bg-context-solid-fill-hover",
			"active:bg-context-solid-fill-active",
			"can-hover:active:bg-context-solid-fill-active",
			"text-context-solid-text",
		].join( " " ),
		theme: [
			"border-theme-solid-border",
			"can-hover:hover:border-theme-solid-border-hover",
			"active:border-theme-solid-border-active",
			"can-hover:active:border-theme-solid-border-active",
			"bg-theme-solid-fill",
			"can-hover:hover:bg-theme-solid-fill-hover",
			"active:bg-theme-solid-fill-active",
			"can-hover:active:bg-theme-solid-fill-active",
			"text-white",
		].join( " " ),
	},
} as const
