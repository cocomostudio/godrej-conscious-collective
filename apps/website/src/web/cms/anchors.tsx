
/**
 |
 | The anchors root assembly handed out, made available to the blocks that were
 | given one.
 |
 | Through a context rather than stamped onto the tree, because everything below
 | the root arrives ready to walk and stays that way. Anchors have to be decided
 | centrally — collisions take a numeric suffix, which needs document order —
 | so a block cannot work its own out.
 |
 */

import {
	type ReactNode,
	createContext,
	use,
} from "react"

import type { Block } from "./envelope.ts"

import { block_key } from "./table-of-contents.ts"

const Anchors_Context = createContext<Record<string, string>>( {} )

export function Anchors (
	{ anchors, children }: {
		anchors: Record<string, string>
		children: ReactNode
	},
) {
	return <Anchors_Context value={ anchors }>{ children }</Anchors_Context>
}

/**
 |
 | Undefined when this block did not opt into the table of contents, which is
 | also when it should carry no id.
 |
 */
export function use_anchor ( block: Pick<Block, "__component" | "id"> ) {
	return use( Anchors_Context )[block_key( block as Block )]
}
