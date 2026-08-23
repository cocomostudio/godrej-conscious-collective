
/**
 |
 | Breakpoints.
 |
 | These REPLACE Tailwind's default screens: exactly these five min-width steps,
 | with no default 2xl.
 |
 | EVERY VALUE HERE MUST STAY A PLAIN MIN-WIDTH STRING. A single object value
 | (`{ raw }`, `{ min }`, `{ max }`) silently degrades the whole build:
 | Tailwind's `screenVariants` flips `areSimpleScreens` to false, which
 |
 |   1. drops every named `max-*` variant (`max-lg:` etc. become build errors), and
 |   2. disables min-width sorting for `xs:`/`sm:`/`md:`/`lg:`/`xl:`, so they emit in
 |      registration order — a silent, site-wide cascade change.
 |
 | See node_modules/tailwindcss/lib/corePlugins.js (`areSimpleScreens`).
 |
 | Height-aware variants therefore live in screens-height.ts as a plugin
 | variant, not here.
 |
 */

export const screens = {
	xs: "320px",
	sm: "390px",
	md: "1024px",
	lg: "1440px",
	xl: "1600px",
}
