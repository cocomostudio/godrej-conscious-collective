
/**
 |
 | Plain string — a leaf. One line of unformatted text, and the bottom of the
 | render tree.
 |
 | Its attribute is called `content` and is a **string**, not a region. The
 | renderer only walks into a `content` that is an array of blocks, which is
 | what keeps the two apart.
 |
 */

import { use_body_text_class } from "../page-layout.tsx"

import type { Text_Color } from "./text-color.ts"

import { text_color_class } from "./text-color.ts"

type Plain_String_Props = {
	content: string | null
	text_color?: Text_Color
}

export function Plain_String ( { content, text_color }: Plain_String_Props ) {
	if ( !content ) {
		return null
	}

	return <p
		className={ `mt-4 first:mt-0 ${use_body_text_class()} ${
			text_color_class( text_color, "black" )
		}` }>
		{ content }
	</p>
}
