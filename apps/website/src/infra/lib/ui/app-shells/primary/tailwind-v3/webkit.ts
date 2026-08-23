
import plugin from "tailwindcss/plugin"

/**
 |
 | WebKit-targeting variants.
 |
 |   webkit:      @supports ( -background: -webkit-named-image(i) )
 |   mobile-webkit:  @supports ( -webkit-touch-callout: none )
 |
 | Both are feature-query hacks, not real feature detection — they name a
 | declaration only WebKit parses, so the block applies exactly on WebKit and is
 | dropped everywhere else. Neither is a `-webkit-` PREFIXED property that
 | Blink also implements (Chrome shipped plenty of those from its WebKit fork,
 | so `@supports (-webkit-appearance: none)` matches Chrome too and is useless
 | here); each of these is engine-exclusive in practice.
 |
 |   webkit         — `-background` is not a property at all. WebKit's parser
 |                     still validates the VALUE, and `-webkit-named-image()` is
 |                     WebKit-only, so the query passes only there. Covers Safari on
 |                     every platform, plus every iOS/iPadOS browser (all of which are
 |                     WebKit under the hood).
 |
 |   mobile-webkit  — `-webkit-touch-callout` is Mobile-Safari-only, so this is the
 |                     narrower of the two: iOS/iPadOS only, any browser there.
 |                     Use it for touch/viewport quirks; use `webkit:` for rendering
 |                     quirks that also hit desktop Safari.
 |
 | The `not-` counterparts are registered by hand alongside each. `@supports
 | not (…)` is the negation form; there is no free twin the way Tailwind derives
 | `max-*` from `theme.screens`.
 |
 | ORDERING: these emit in registration order, after the core variants and
 | before the screen variants that follow them in `plugins`. At equal
 | specificity a later rule wins, so don't lean on order to beat a `lg:` rule —
 | stack them (`lg:webkit:`) instead, which nests both conditions.
 |
 */

/** name → the feature query, minus the `@supports` keyword. */
const engines: Record<string, string> = {
	webkit: "( -background: -webkit-named-image(i) )",
	"mobile-webkit": "( -webkit-touch-callout: none )",
}

export const webkit_plugin = plugin( ( { addVariant } ) => {
	for ( const [ name, condition ] of Object.entries( engines ) ) {
		addVariant( name, `@supports ${condition}` )
		addVariant( `not-${name}`, `@supports not ${condition}` )
	}
} )
