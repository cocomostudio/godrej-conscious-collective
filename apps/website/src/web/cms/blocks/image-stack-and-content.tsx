
/**
 |
 | Image stack and content — a composite. Three pictures scattered over one
 | another, beside words.
 |
 | The stack's own box is deliberately taller than any one picture in it: two of
 | the three are pulled up out of the flow, so the box has to be extended by
 | hand to leave room for what hangs below. Its aspect ratio is what does that,
 | because an element's height can be expressed in terms of its width and not in
 | terms of its own height.
 |
 | A sidecar note beside the static site's version works the extension out at
 | 20/27 and the live file uses 2/1.76. The note describes an approach that was
 | not the one shipped, so the shipped ratio is the one lifted.
 |
 */

import type { ReactNode } from "react"

import type { Responsive_Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { responsive_picture_of } from "../media.ts"
import { Responsive_Picture } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

const LAYOUTS: Record<string, string> = {
	"images-left": "md:flex-row",
	"images-right": "md:flex-row-reverse",
}

// Where each of the three sits inside the stack, in the order an editor gives
// them. Positional rather than named, because the design's arrangement is what
// makes it a stack rather than a column.
const PLACEMENTS = [
	"flex",
	"flex justify-end absolute w-full -translate-y-2/3",
	"flex justify-center -translate-y-1/5",
]

type Image_Stack_And_Content_Props = {
	layout?: string
	images?: Responsive_Image_Attribute[]
	children: ReactNode
}

export function Image_Stack_And_Content (
	{ children, images = [], layout = "images-left" }:
		Image_Stack_And_Content_Props,
) {
	const origin = use_media_origin()
	const pictures = images
		.map( ( image ) => responsive_picture_of( image, origin ) )
		.filter( ( picture ) => picture !== null )

	return <div
		className={ `${BLOCK_SPACING} md:flex md:items-center ${
			LAYOUTS[layout] ?? LAYOUTS["images-left"]
		}` }>
		{ pictures.length > 0
			&& <div className="md:py-20 md:w-6c shrink-0">
				<div className="relative aspect-[2/1.76]">
					<div className="absolute top-0 w-full h-full">
						{ pictures.map( ( picture, index ) =>
							<div
								className={ PLACEMENTS[index]
									?? PLACEMENTS[
										PLACEMENTS.length - 1
									] }
								key={ index }>
								<div className="relative text-[0rem]">
									<figure className="inline-block max-w-2c md:max-w-4c aspect-4/3 rounded-lg overflow-hidden">
										<Responsive_Picture
											className="w-full h-full object-cover object-[left_20%]"
											pictures={ picture } />
									</figure>
								</div>
							</div>
						) }
					</div>
				</div>
			</div> }

		<div className="max-md:mt-8 md:ml-1c grow">{ children }</div>
	</div>
}
