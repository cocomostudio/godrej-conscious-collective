
/**
 |
 | Peer-state variants that reach DESCENDANTS of a peer's sibling, not just the
 | sibling itself.
 |
 | Tailwind's stock `peer-*` compiles to `.peer:checked ~ &` — a sibling
 | combinator. That is enough when the styled element sits directly beside the
 | peer, but not when it is nested inside a sibling, which is the normal shape
 | for a CSS-only disclosure:
 |
 |   <input class="peer">                    ← the state lives here
 |   <div>                                   ← sibling
 |     <label><svg class="…" /></label>      ← what we actually need to style
 |   </div>
 |
 | These variants add the missing descendant hop:
 |
 |   peer-checked-deep:        .peer:checked ~ * &
 |   peer-focus-visible-deep:  .peer:focus-visible ~ * &
 |
 | `:merge(.peer)` mirrors Tailwind's own peer implementation, so these compose
 | with the built-in `peer-*` variants rather than fighting them.
 |
 | Used by the site header's no-JS mobile navigation (see site-header.tsx).
 | Kept out of selectors.ts, which is scoped to structural/positional variants.
 |
 | `peer-resting` is the odd one out — not a descendant hop but a COMPOUND
 | condition, and it is here for the same reason: stock `peer-*` cannot say it.
 | See the comment above it.
 |
 */

import plugin from "tailwindcss/plugin"

export const state_variants_plugin = plugin( ( { addVariant } ) => {
	addVariant( "peer-checked-deep", ":merge(.peer):checked ~ * &" )
	addVariant( "peer-focus-visible-deep", ":merge(.peer):focus-visible ~ * &" )
	addVariant( "peer-focus-deep", ":merge(.peer):focus ~ * &" )

	/*
	 | A floating label's RESTING state: the input beside it is empty AND does
	 | not have focus. Anything else — focused, or holding a value — is the
	 | floated state.
	 |
	 | This has to be one compound variant rather than `peer-placeholder-shown:`
	 | undone by `peer-focus:`, because those two would land at equal
	 | specificity and Tailwind emits `placeholder-shown` AFTER `focus`. The
	 | resting rules would then win while the field was focused and empty, which
	 | is precisely the moment the label is supposed to lift.
	 |
	 | `:placeholder-shown` is the emptiness test, so an input using this must
	 | carry a placeholder — `placeholder=" "` is the convention, since the
	 | label is doing the placeholder's job. It costs no JavaScript and it is
	 | right on the very first paint, before React has hydrated.
	 */
	addVariant(
		"peer-resting",
		":merge(.peer):placeholder-shown:not(:focus) ~ &",
	)
} )
