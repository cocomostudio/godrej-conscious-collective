
/**
 |
 | Link — a leaf, and one of the four an editor may place inside a composite.
 |
 | The design presses its button into service for every call to action, so a
 | link an editor marked as a button is that button rendered as an anchor rather
 | than a second thing that looks like one.
 |
 */

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

import type { Link as Link_Attribute } from "../envelope.ts"

import { Nav_Link } from "../nav-link.tsx"

export function Link_Block ( { label, style, url }: Partial<Link_Attribute> ) {
	if ( !url ) {
		return null
	}

	const text = label || url

	if ( style === "button" ) {
		return <p className="mt-4 first:mt-0">
			<Button
				emphasis="outline"
				color="context"
				render={ <Nav_Link url={ url } /> }>
				{ text }
				<Button.Icon name="chevron-right" />
			</Button>
		</p>
	}

	return <p className="mt-4 first:mt-0 text-p text-black">
		<Nav_Link
			className="font-button uppercase text-context underline underline-offset-3"
			url={ url }>
			{ text }
		</Nav_Link>
	</p>
}
