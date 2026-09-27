
/**
 |
 | Map and content — a composite. A map beside words.
 |
 | The map floats, so the words wrap beneath it once there are more of them than
 | the map is tall. Below the medium breakpoint the map sits above the words in
 | one column.
 |
 | The map itself decides whether anything third-party is loaded: with a picture
 | set, nothing is.
 |
 | **The gap under the map belongs to the map**: 24px, and 32px from the medium
 | breakpoint. The words start with no margin of their own, because the first
 | of them could be a heading, a link or a passage, and each spaces itself
 | differently. From the medium breakpoint that gap is the float's own bottom
 | margin, which is the only thing that keeps words wrapping under the map off
 | it.
 |
 | **A float's margin is part of the block's height, and it cannot be kept out
 | of it.** So when the words are shorter than the map, the block would end 32px
 | below the map, and then leave its usual 32px on top. To make that the same
 | in every case, the words carry 32px of padding under them too. From the
 | medium breakpoint the block therefore always ends with its own 32px gap, so it
 | takes the next block's top margin away rather than adding a margin of its
 | own. As the last block in a section, it pulls those 32px back into the
 | section's padding.
 |
 */

import type { ReactNode } from "react"

import type { Map_Attribute } from "./google-map.tsx"

import { Google_Map } from "./google-map.tsx"

import { ABOVE } from "./block-spacing.ts"

const FLOATS: Record<string, string> = {
	"map-left": "md:float-left md:mr-8",
	"map-right": "md:float-right md:ml-8",
}

// Below the medium breakpoint, the gap every block leaves, marked for a rule
// that follows; see `block-spacing.ts`. From it, the gap the block already
// ends with stands in for its margin. `!` because the next block's own top
// margin is a class of the same weight, and which of the two wins would
// otherwise come down to their order in the stylesheet.
const BELOW = [
	"leaves-gap-below mb-6 last:mb-0",
	"md:mb-0 md:last:-mb-8 md:[&+*]:!mt-0",
].join( " " )

type Map_And_Content_Props = {
	layout?: string
	map?: Map_Attribute | null
	children: ReactNode
}

export function Map_And_Content (
	{ children, layout = "map-left", map }: Map_And_Content_Props,
) {
	return <div className={ `flow-root ${ABOVE} ${BELOW}` }>
		{ map && <div
			className={ `${
				FLOATS[layout] ?? FLOATS["map-left"]
			} w-full md:max-w-110 mb-6 md:mb-8` }>
			<Google_Map { ...map } />
		</div> }

		<div className="md:pb-8">{ children }</div>
	</div>
}
