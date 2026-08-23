
/**
 |
 | Image link — a leaf. A picture that is also a link.
 |
 | The label is what a visitor who cannot see the picture is told the link goes
 | to, so it lands on the anchor rather than beside it. Where the picture has
 | alternative text of its own, that describes the picture and the label
 | describes the destination — two different sentences, both worth having.
 |
 */

import type { Responsive_Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { responsive_picture_of } from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { Responsive_Picture } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

export type Image_Link_Attribute = {
	label?: string | null
	url: string
	image?: Responsive_Image_Attribute | null
}

export function Image_Link ( { image, label, url }: Image_Link_Attribute ) {
	const pictures = responsive_picture_of( image, use_media_origin() )

	if ( !pictures || !url ) {
		return null
	}

	return <p className={ BLOCK_SPACING }>
		<Nav_Link
			aria-label={ label || undefined }
			className="inline-block"
			url={ url }>
			<Responsive_Picture
				className="w-full rounded-lg object-cover"
				pictures={ pictures } />
		</Nav_Link>
	</p>
}
