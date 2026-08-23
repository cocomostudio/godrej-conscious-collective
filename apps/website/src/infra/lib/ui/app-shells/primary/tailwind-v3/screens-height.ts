
import plugin from "tailwindcss/plugin"

/**
 |
 | Height-aware screen variants.
 |
 |   tall:       @media (min-height: 836px)
 |   max-tall:   @media not all and (min-height: 836px)
 |
 | These are registered as plugin variants rather than entries in
 | `theme.screens` on purpose. Tailwind v3 checks that every screen value is a
 | plain string (`areSimpleScreens` in corePlugins.js); one object value
 | (`{ raw }`) drops all `max-*` variants and disables min-width sorting for
 | `xs:`/`sm:`/`md:`/`lg:`/`xl:`. Registering here keeps `screens` simple, so both
 | keep working. See the warning block in screens.ts.
 |
 | The `max-` counterpart must be registered BY HAND, here. Tailwind's `max-*`
 | is a single `matchVariant("max", …)` in corePlugins.js whose named values are
 | built from `theme.screens` alone, so a plugin variant gets no `max-` twin for
 | free. Its arbitrary form is no escape hatch either: `max-[…]` feeds the value
 | straight into `(max-width: …)` (see `toScreen` in util/normalizeScreens.js),
 | so it can only ever express a WIDTH. Without the explicit registration below,
 | `max-tall:` is an unknown variant and the utility silently never emits.
 |
 | The condition is negated as `not all and (min-height: …)` rather than
 | `(max-height: 835px)`, mirroring what Tailwind does for the width screens.
 | Negating the exact same value keeps the pair an exclusive partition at every
 | viewport height — no overlap, and no gap for fractional heights.
 |
 | The name is spelled out rather than abbreviated: the width steps are a scale
 | (sm/md/lg/xl), so an odd-one-out name flags at every call site that this
 | variant switches axis. `tl` would also collide with the top-left
 | abbreviation — see `tl: "to top left"` in gradients.ts.
 |
 | Combinations need no dedicated variant. Tailwind v3.2+ stacks variants, so
 | `lg:tall:` emits a nested `@media (min-width: 1440px) and
 | (min-height: 836px)`. Either order works; prefer width-first for consistency.
 |
 | ORDERING: `tall:` emits BEFORE the width screens, so at equal specificity a
 | plain `lg:` rule beats a `tall:` one setting the same property. Don't rely on
 | declaration order to resolve that — reach for the stacked `lg:tall:` form,
 | which nests inside `lg` and is unambiguous.
 |
 */

/** name → the media condition, minus the `@media` keyword. */
const heights: Record<string, string> = {
	tall: "(min-height: 836px)",
}

export const screens_height_plugin = plugin( ( { addVariant } ) => {
	for ( const [ name, condition ] of Object.entries( heights ) ) {
		addVariant( name, `@media ${condition}` )
		addVariant( `max-${name}`, `@media not all and ${condition}` )
	}
} )
