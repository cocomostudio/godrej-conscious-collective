
/**
 |
 | Which of the two arrangements the page is in, made available to the blocks
 | below the root.
 |
 | One thing reads it: a section is padded more generously on a one-column page
 | than on a two-column one, because a one-column page has the full width and
 | the design opens it up. That is a fact about the page rather than about the
 | section, and a section can sit at any depth, so it travels by context — the
 | same reason the anchors and the media origin do.
 |
 */

import {
	type ReactNode,
	createContext,
	use,
} from "react"

import type { Page_Layout as Arrangement } from "./envelope.ts"

const Page_Layout_Context = createContext<Arrangement>( "two-column" )

export function Page_Layout (
	{ children, layout }: { children: ReactNode; layout: Arrangement },
) {
	return <Page_Layout_Context value={ layout }>
		{ children }
	</Page_Layout_Context>
}

export function use_page_layout () {
	return use( Page_Layout_Context )
}
