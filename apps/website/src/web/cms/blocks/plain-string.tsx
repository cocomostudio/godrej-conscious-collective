
/**
 |
 | Plain string — a leaf. One line of unformatted text, and the bottom of the
 | render tree.
 |
 | Its attribute is called `content` and is a **string**, not a region. The
 | renderer only walks into a `content` that is an array of blocks, which is
 | what keeps the two apart.
 |
 | **The colour is read before the empty check, not inside the markup.** An
 | editor can clear this block's one attribute without removing the block, so
 | `content` genuinely flips between empty and filled on a live entry — and a
 | hook called only on the filled branch changes this component's hook count
 | between two renders, which is the "rendered more hooks than during the
 | previous render" crash rather than a style point.
 |
 | **The paragraph itself is `Prose_Paragraph`**, which is also what a paragraph
 | typed inside a text block is drawn as. The two are the same run of words and
 | there is one implementation of them.
 |
 | **Where nobody answered, the words are black.** The schema stores `auto` and
 | declines to choose; the fallback below is this component's own, and is what a
 | plain string has always drawn. See `text-color.ts`.
 |
 */

import { use_text_colour_class } from "../dark-surface.tsx"

import type { Text_Color } from "./text-color.ts"

import { Prose_Paragraph } from "./prose-paragraph.tsx"

type Plain_String_Props = {
	content: string | null
	text_color?: Text_Color
}

export function Plain_String ( { content, text_color }: Plain_String_Props ) {
	const prose = use_text_colour_class( text_color, "black" )

	if ( !content ) {
		return null
	}

	return <Prose_Paragraph colour={ prose }>{ content }</Prose_Paragraph>
}
