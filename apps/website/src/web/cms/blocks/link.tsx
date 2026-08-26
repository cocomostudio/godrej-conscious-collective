
/**
 |
 | Link — a leaf, and one of the four an editor may place inside a composite.
 |
 | The design presses its button into service for every call to action, so a
 | link an editor marked as a button is that button rendered as an anchor rather
 | than a second thing that looks like one.
 |
 | `text_color` is the button's colour as well as the plain link's: an outline
 | button draws its border in the same colour as its words, so the one choice
 | answers for both and there is no second attribute for the border.
 |
 */

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

import type { Link as Link_Attribute } from "../envelope.ts"

import { use_text_colour_token } from "../dark-surface.tsx"
import { Nav_Link } from "../nav-link.tsx"
import { Chevron_Right } from "#infra/lib/ui/react/icons/chevron-right.tsx"
import { text_color_class } from "./text-color.ts"

export function Link_Block (
	{ label, style, text_color, url }: Partial<Link_Attribute>,
) {
	// Resolved before the guard below, because it reads a context and a hook
	// called only on the branch where there is a URL changes this component's
	// hook count when an editor clears the field.
	const colour = use_text_colour_token( text_color, "context" )

	if ( !url ) {
		return null
	}

	const text = label || url

	if ( style === "button" ) {
		return <p className="mt-4 first:mt-0">
			<Button
				emphasis="outline"
				color={ colour }
				render={ <Nav_Link url={ url } /> }>
				{ text }
				<Button.Icon name="chevron-right" />
			</Button>
		</p>
	}

	// Plain style: a text link with a right chevron beside it, matching the
	// static site's "View All" section links. Not a button — the button
	// branch above is a separate call to action.
	return <p className="mt-4 first:mt-0">
		<Nav_Link
			className={ `inline-flex gap-1 items-center text-h6 underline underline-offset-4 whitespace-nowrap ${
				text_color_class( colour, "context" )
			}` }
			url={ url }>
			{ text }
			<Chevron_Right className="size-4" />
		</Nav_Link>
	</p>
}
