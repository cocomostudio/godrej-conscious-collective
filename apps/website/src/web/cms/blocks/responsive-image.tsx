
/**
 |
 | Responsive image — a leaf. Three crops of one picture, one per width.
 |
 | The words under it come from whichever of the three the browser did not
 | choose to hide, which is the small one: a title and a caption are the same
 | sentence at every width, and the alternatives exist for the crop.
 |
 */

import type { Responsive_Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { responsive_picture_of } from "../media.ts"
import {
	Picture_Caption,
	Responsive_Picture,
} from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

export function Responsive_Image ( responsive: Responsive_Image_Attribute ) {
	const pictures = responsive_picture_of( responsive, use_media_origin() )

	if ( !pictures ) {
		return null
	}

	return <figure className={ BLOCK_SPACING }>
		<Responsive_Picture
			className="w-full rounded-lg object-cover"
			pictures={ pictures } />

		<Picture_Caption className="mt-4" picture={ pictures.small } />
	</figure>
}
