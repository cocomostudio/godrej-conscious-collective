
/**
 |
 | The back link: first thing in the sidebar, on every two-column page.
 |
 | What it says follows from the content type, and is decided during root
 | assembly. It is shaped as a button because that is what the design does with
 | it — it is the one element in the sidebar a visitor is meant to press.
 |
 | On a session it appears twice, because the design shows it twice: once in the
 | sidebar, which that page hides on a phone, and once inside the masthead,
 | which is where a phone shows it instead.
 |
 */

import { Link } from "react-router"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

type Back_Link_Props = {
	label: string
	url: string
	/**
	 |
	 | The design gives it two colours, one per place it appears: the context
	 | colour in the sidebar, against grey, and white in the masthead, against
	 | the context colour itself.
	 |
	 */
	color?: "context" | "white"
}

export function Back_Link (
	{ color = "context", label, url }: Back_Link_Props,
) {
	return <Button
		emphasis="outline"
		color={ color }
		render={ <Link to={ url } /> }>
		<Button.Icon name="chevron-left" />
		{ label }
	</Button>
}
