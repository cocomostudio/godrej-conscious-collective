
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
	 | The design gives it a colour per place it appears: the context colour in
	 | the sidebar, against grey, and white in the masthead, against the context
	 | colour itself.
	 |
	 | **`context-above-md` is the sidebar that is both.** On a Page whose
	 | sidebar takes the context colour below the medium breakpoint, the link is
	 | drawn against that colour there and against grey from there up — one
	 | element, two backgrounds, so it cannot be told apart by a prop the way
	 | the masthead's copy is. See `Sidebar` in `root.tsx`.
	 |
	 */
	color?: "context" | "context-above-md" | "white"
}

export function Back_Link (
	{ color = "context", label, url }: Back_Link_Props,
) {
	// The responsive answer is the button's own colour map turned off — it
	// holds one class per colour and cannot hold a breakpoint — and the two
	// classes written here instead. The border follows the text either way:
	// an outline with no colour named takes `border-current`.
	return <Button
		className={ color === "context-above-md"
			? "max-md:text-white md:text-context"
			: "" }
		emphasis="outline"
		color={ color === "context-above-md" ? "none" : color }
		render={ <Link to={ url } /> }>
		<Button.Icon name="chevron-left" />
		{ label }
	</Button>
}
