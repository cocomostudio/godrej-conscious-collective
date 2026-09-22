import plugin from "tailwindcss/plugin"

/**
 |
 | Pointer-capability variant.
 |
 |   can-hover:   @media ( hover: hover ) and ( pointer: fine )
 |
 | A touch screen has no hover, yet a tap sets `:hover` on the thing tapped and
 | leaves it set until the next tap lands elsewhere. A `hover:` rule on a touch
 | screen is therefore a rule that fires on tap and then sticks. This variant
 | asks whether the device can hover at all, so a rule stacked under it never
 | fires on a touch-only device and has nothing to stick.
 |
 | The query follows the device, not the class of device. Safari on iPadOS
 | answers it false until a mouse or trackpad is connected and true from then
 | on, so an iPad with a trackpad keeps every rule stacked under this. WebKit
 | has done this since October 2020, well inside the Safari 15 floor.
 |
 | This is the query Tailwind's `hoverOnlyWhenSupported` flag wraps every
 | `hover:` in. The flag is deliberately off: not every hover style on the
 | site wants gating, so each one that does says so by stacking, as in
 | `can-hover:group-hover:bg-context`.
 |
 | Stacking order does not matter for correctness — `can-hover:group-hover:`
 | and `group-hover:can-hover:` both nest the selector inside the media
 | query — but write the media variant outermost, as `lg:webkit:` does, so a
 | class reads the way its CSS nests.
 |
 */

export const pointer_plugin = plugin( ( { addVariant } ) => {
	addVariant( "can-hover", "@media ( hover: hover ) and ( pointer: fine )" )
} )
