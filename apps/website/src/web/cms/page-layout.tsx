
/**
 |
 | Which of the two arrangements the page is in, made available to the blocks
 | below the root.
 |
 | Several concerns read it, and all for the same reason — the design opens up
 | a one-column page with the full width and gives it a larger scale for
 | headings, body copy and section padding. A section can sit at any depth,
 | and so can a paragraph or a heading, so the arrangement travels by context
 | — the same reason the anchors and the media origin do.
 |
 | Body text uses `text-h4` on a one-column page and `text-p` on a two-column
 | one; the page title uses `text-h1` and `text-h2` at the same split. Both
 | are exposed as helpers below, so a block that renders prose or a heading
 | asks one question and gets the class the design agrees on rather than
 | inlining the rule.
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

/**
 |
 | The body-text size class for the current page's arrangement.
 |
 | A one-column page reads at `text-h4`; a two-column page at `text-p`. The
 | rule is shared by every block that renders prose — plain strings, wysiwyg
 | paragraphs, section opening lines — so it lives here beside the arrangement
 | rather than inlined in each block.
 |
 */
export function use_body_text_class () {
	return use_page_layout() === "one-column" ? "text-h4" : "text-p"
}

/**
 |
 | The page-title size class for the current page's arrangement.
 |
 | A one-column page carries the h1 in its main column and wears `text-h1`
 | on it; a two-column page's title lives in the sidebar and wears `text-h2`
 | in the context colour. Both include their weight because the design uses
 | one weight either way.
 |
 */
export function use_page_title_class () {
	return use_page_layout() === "one-column"
		? "text-h1 font-semibold"
		: "text-h2 font-semibold text-context"
}
