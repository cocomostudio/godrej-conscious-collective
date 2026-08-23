
/**
 |
 | The back link: first thing in the sidebar, on every two-column page.
 |
 | What it says follows from the content type, and is decided during root
 | assembly. It is shaped as a button because that is what the design does with
 | it — it is the one element in the sidebar a visitor is meant to press.
 |
 */

import { Link } from "react-router"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

type Back_Link_Props = {
	label: string
	url: string
}

export function Back_Link ( { label, url }: Back_Link_Props ) {
	return <Button
		emphasis="outline"
		color="context"
		render={ <Link to={ url } /> }>
		<Button.Icon name="chevron-left" />
		{ label }
	</Button>
}
