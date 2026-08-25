
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

// The static site's single-entry gallery renders wide-first as a 4:3
// crop beside a square, so the two figures land at close-to-equal
// heights despite the differing column widths. The equal layout keeps
// both at 4:3 — same column widths, same height falls out naturally.
const IMAGE_ASPECTS: Record<string, string[]> = {
	"equal": [ "aspect-[4/3]", "aspect-[4/3]" ],
	"wide-first": [ "aspect-[4/3]", "md:aspect-square" ],
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

	const aspects = IMAGE_ASPECTS[layout] ?? IMAGE_ASPECTS.equal

	return <div
		className={ `${BLOCK_SPACING} grid gap-5.5 md:gap-8 items-stretch ${
			LAYOUTS[layout] ?? LAYOUTS.equal
		}` }>
		{ pictures.map( ( picture, index ) =>
			<figure key={ index } className="flex flex-col">
				<Picture_Image
					className={ `w-full ${
						aspects[index] ?? aspects[0]
					} rounded-lg object-cover` }
					picture={ picture } />

				<Picture_Caption className="mt-4" picture={ picture } />
			</figure>
		) }
	</div>
}
