
/**
 |
 | Image and content — a composite. A picture beside words.
 |
 | Its region is `content`, so the renderer walks into it with no rename step
 | and hands it here as `children`. It opens no heading level of its own: a
 | composite is an arrangement rather than a division of the document, and a
 | heading inside one should rank the same as a heading beside it.
 |
 | From the medium breakpoint upward the picture floats into one column while
 | its title and caption sit in the other — which is why the caption is
 | positioned against the picture rather than flowing beneath it. Once the words
 | run past the bottom of the picture they wrap under it, which is what a float
 | is for and what the static site relies on.
 |
 | Below that breakpoint there is one column and the picture sits above the
 | words.
 |
 */

import type { ReactNode } from "react"

import type { Image_Attribute } from "../media.ts"

import { use_dark_surface } from "../dark-surface.tsx"
import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import {
	Picture_Caption,
	Picture_Image,
} from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

const FLOATS: Record<string, { figure: string; caption: string }> = {
	"image-left": {
		caption: "left-full pl-8 pr-16",
		figure: "float-left mr-8",
	},
	"image-right": {
		caption: "right-full pl-16 pr-8",
		figure: "float-right ml-8",
	},
}

type Image_And_Content_Props = {
	layout?: string
	image?: Image_Attribute | null
	children: ReactNode
}

export function Image_And_Content (
	{ children, image, layout = "image-left" }: Image_And_Content_Props,
) {
	const picture = picture_of( image, use_media_origin() )
	const float = FLOATS[layout] ?? FLOATS["image-left"]
	// The floated caption is positioned over the column of words rather than
	// flowing in it, so it paints its own ground to stay legible against
	// whatever ran underneath. That ground is the page's, not the block's.
	const caption_ground = use_dark_surface() ? "bg-black" : "bg-white"

	return <div className={ `flow-root ${BLOCK_SPACING}` }>
		{ picture && <>
			<figure
				className={ `max-md:hidden relative ${float.figure} max-w-4c1g mb-8 [&+*]:mt-0` }>
				<Picture_Image
					className="w-full object-cover rounded-lg"
					picture={ picture } />

				<Picture_Caption
					className={ `absolute bottom-0 ${float.caption} w-5c ${caption_ground}` }
					picture={ picture } />
			</figure>

			<figure className="md:hidden mb-6">
				<Picture_Image
					className="w-full object-cover rounded-lg"
					picture={ picture } />

				<Picture_Caption className="mt-4" picture={ picture } />
			</figure>
		</> }

		{ children }
	</div>
}
