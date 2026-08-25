
/**
 |
 | Full-bleed image — a leaf. The responsive image, drawn edge to edge.
 |
 | It holds what the responsive image holds — three crops of one picture, one
 | per width — and differs in where it is drawn rather than in what it stores,
 | so the picture, the fallback between the crops and the words all come from
 | the same place. Three differences, and they are the whole of the component:
 |
 |   • **It breaks out of the container it was placed in.** On a one-column page
 |     that is out to the window's edges; in the main column of a two-column
 |     page it is out of the column's own inset on the left and across the white
 |     box's two gutters on the right. `use_column_bleed` names both.
 |
 |   • **No rounded corners.** A picture that runs to the edge of the column has
 |     no corners left to round.
 |
 |   • **The words are read rather than shown.** A picture at this size is the
 |     design's own statement and a caption printed under it would be a second
 |     one; what the editor wrote still belongs to somebody using a screen
 |     reader, so it is rendered and hidden rather than dropped.
 |
 | It carries `spacing_around`, which is the editor's say over the gap above and
 | below — and, where it opens or closes a section, over that section's padding
 | at the same edge. See `block-spacing.ts`.
 |
 */

import type { Responsive_Image_Attribute } from "../media.ts"

import type { Spacing_Around } from "./block-spacing.ts"

import { block_spacing } from "./block-spacing.ts"
import { use_column_bleed } from "./section-frame.tsx"
import { use_media_origin } from "../media-origin.tsx"
import { responsive_picture_of } from "../media.ts"
import {
	Picture_Caption,
	Responsive_Picture,
} from "../pictures.tsx"

type Full_Bleed_Image_Props = Responsive_Image_Attribute & {
	spacing_around?: Spacing_Around
}

export function Full_Bleed_Image (
	{ spacing_around, ...responsive }: Full_Bleed_Image_Props,
) {
	const pictures = responsive_picture_of( responsive, use_media_origin() )
	const bleed = use_column_bleed()

	if ( !pictures ) {
		return null
	}

	return <figure className={ `${bleed} ${block_spacing( spacing_around )}` }>
		<Responsive_Picture
			className="w-full object-cover"
			pictures={ pictures } />

		<Picture_Caption className="sr-only" picture={ pictures.small } />
	</figure>
}
