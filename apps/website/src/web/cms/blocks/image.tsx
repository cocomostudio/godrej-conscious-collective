
/**
 |
 | Image — a leaf. One picture and the words that go with it.
 |
 | An image with neither a file nor a url renders nothing rather than an empty
 | frame: an editor who has not chosen a picture yet should see the page without
 | one, not a broken box where one will go.
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

export function Image ( image: Image_Attribute ) {
	const picture = picture_of( image, use_media_origin() )

	if ( !picture ) {
		return null
	}

	return <figure className={ BLOCK_SPACING }>
		<Picture_Image
			className="w-full rounded-lg object-cover"
			picture={ picture } />

		<Picture_Caption className="mt-4" picture={ picture } />
	</figure>
}
