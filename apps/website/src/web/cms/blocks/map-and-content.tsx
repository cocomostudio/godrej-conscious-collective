
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
 */

import type { ReactNode } from "react"

import type { Map_Attribute } from "./google-map.tsx"

import { Google_Map } from "./google-map.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

const FLOATS: Record<string, string> = {
	"map-left": "md:float-left md:mr-8",
	"map-right": "md:float-right md:ml-8",
}

type Map_And_Content_Props = {
	layout?: string
	map?: Map_Attribute | null
	children: ReactNode
}

export function Map_And_Content (
	{ children, layout = "map-left", map }: Map_And_Content_Props,
) {
	return <div className={ `flow-root ${BLOCK_SPACING}` }>
		{ map && <div
			className={ `${
				FLOATS[layout] ?? FLOATS["map-left"]
			} md:max-w-110 md:[&+*]:mt-0` }>
			<Google_Map { ...map } />
		</div> }

		{ children }
	</div>
}
