
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

export function Plain_String ( { content }: { content: string | null } ) {
	if ( !content ) {
		return null
	}

	return <p className={ `mt-4 first:mt-0 ${use_body_text_class()} text-black` }>
		{ content }
	</p>
}
