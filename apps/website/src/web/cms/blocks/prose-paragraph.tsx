
/**
 |
 | One paragraph of prose, and the one implementation of it.
 |
 | A paragraph an editor typed inside a text block and a plain string component
 | placed on its own are the same run of words, and a visitor should not be able
 | to tell which tool produced which. Two implementations of that would drift by
 | a margin or a size the first time either was touched, so there is one and both
 | go through it.
 |
 | It answers for the size the page's arrangement asks for and for the gap the
 | catalogue asks for. The colour stays the caller's, because what a block draws
 | its words in is a question about the block rather than about the paragraph. A
 | WYSIWYG works that colour out once for a passage of many paragraphs, and a
 | plain string works it out for its one.
 |
 */

import type { ReactNode } from "react"

import { use_body_text_class } from "../page-layout.tsx"

type Prose_Paragraph_Props = {
	children: ReactNode
	colour: string
}

export function Prose_Paragraph ( { children, colour }: Prose_Paragraph_Props ) {
	const body_size = use_body_text_class()

	return <p className={ `mt-4 first:mt-0 ${body_size} ${colour}` }>
		{ children }
	</p>
}
