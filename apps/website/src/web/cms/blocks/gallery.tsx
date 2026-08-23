
/**
 |
 | Gallery — a leaf. Two pictures in one row.
 |
 | `images` is a **repeatable component list, not a region**: its members carry
 | no `__component`, so they arrive as raw data and this block does what it
 | likes with them rather than the renderer walking into them.
 |
 | One column below the medium breakpoint, because two of these side by side on
 | a phone is two thumbnails.
 |
 */

import type { Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import {
	Picture_Caption,
	Picture_Image,
} from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

const LAYOUTS: Record<string, string> = {
	"equal": "md:grid-cols-2",
	"wide-first": "md:grid-cols-[57fr_43fr]",
}

export function Gallery (
	{ images = [], layout = "equal" }: {
		images?: Image_Attribute[]
		layout?: string
	},
) {
	const origin = use_media_origin()
	const pictures = images
		.map( ( image ) => picture_of( image, origin ) )
		.filter( ( picture ) => picture !== null )

	if ( pictures.length === 0 ) {
		return null
	}

	return <div
		className={ `${BLOCK_SPACING} grid gap-5.5 md:gap-8 ${
			LAYOUTS[layout] ?? LAYOUTS.equal
		}` }>
		{ pictures.map( ( picture, index ) =>
			<figure key={ index }>
				<Picture_Image
					className="w-full aspect-[4/3] rounded-lg object-cover"
					picture={ picture } />

				<Picture_Caption className="mt-4" picture={ picture } />
			</figure>
		) }
	</div>
}
