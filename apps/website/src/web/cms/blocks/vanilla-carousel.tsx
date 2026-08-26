
/**
 |
 | Carousel — a leaf. A row of linked pictures the visitor scrolls sideways.
 |
 | No carousel library and no JavaScript: a flex row with `overflow-auto`. The
 | static site's About carousel is exactly this, and the general design note in
 | that repository argues the case — a plain scrolling container is the right
 | answer until you need accessible controls, which neither carousel has.
 |
 | Identical in attributes to the Instagram feed and entirely different here.
 | That is why they are two components: an enum collapsing them would name its
 | options after the pages they appear on.
 |
 */

import type { Image_Link_Attribute } from "./image-link.tsx"

import { use_media_origin } from "../media-origin.tsx"
import { responsive_picture_of } from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { Responsive_Picture } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

export function Vanilla_Carousel (
	{ slides = [] }: { slides?: Image_Link_Attribute[] },
) {
	const origin = use_media_origin()

	if ( slides.length === 0 ) {
		return null
	}

	return <div className={ `${ BLOCK_SPACING } md:-mx-2g` }>
		<ul className="flex gap-4 md:gap-8 overflow-auto scrollbar-none pt-6 md:pt-8 px-1ccm md:pl-16 md:pr-0 md:*-last:pr-16">
			{ slides.map( ( slide, index ) => {
				const pictures = responsive_picture_of(
					slide?.image,
					origin,
				)

				if ( !pictures || !slide?.url ) {
					return null
				}

				return <li className="shrink-0" key={ index }>
					<Nav_Link
						aria-label={ slide.label || undefined }
						url={ slide.url }
						target="_blank">
						<figure className="w-51 aspect-portrait rounded-lg bg-black overflow-hidden">
							<Responsive_Picture
								className="size-full object-cover rounded-lg"
								pictures={ pictures } />
						</figure>
					</Nav_Link>
				</li>
			} ) }
		</ul>
	</div>
}
