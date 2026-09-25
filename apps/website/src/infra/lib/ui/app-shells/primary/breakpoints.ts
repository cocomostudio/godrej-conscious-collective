/**
 |
 | The design's breakpoints: the widths the layout changes at, and the one
 | height it changes at.
 |
 | Tailwind builds its `xs:`…`xl:` variants from `breakpoints` and its `tall:`
 | variant from `tall`. Components, media queries and the browser tests read
 | the same two exports, so every one of them switches at the same pixel. This
 | module imports nothing, so a component can import it without pulling the
 | Tailwind config into the browser bundle.
 |
 | Two rules:
 |
 |   1. `breakpoints` REPLACES Tailwind's default screens: exactly these five
 |      min-width steps, with no default 2xl.
 |   2. EVERY VALUE IN `breakpoints` MUST STAY A PLAIN MIN-WIDTH STRING. That is
 |      why `tall` is a separate export: the height-aware variant is a plugin
 |      variant (tailwind-v3/screens-height.ts), not a screen.
 |
 | # Why rule 2
 |
 | A single object value (`{ raw }`, `{ min }`, `{ max }`) silently degrades
 | the whole build. Tailwind's `screenVariants` flips `areSimpleScreens` to
 | false, which
 |
 |   1. drops every named `max-*` variant (`max-lg:` etc. become build errors), and
 |   2. disables min-width sorting for `xs:`/`sm:`/`md:`/`lg:`/`xl:`, so they emit in
 |      registration order — a silent, site-wide cascade change.
 |
 | See node_modules/tailwindcss/lib/corePlugins.js (`areSimpleScreens`).
 |
 */

export const breakpoints = {
	xs: "320px",
	sm: "390px",
	md: "1024px",
	lg: "1440px",
	xl: "1600px",
}

export const tall = "836px"
