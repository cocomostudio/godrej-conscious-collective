
/**
 |
 | Sponsors list — a leaf. The organisations that support the event.
 |
 | `sponsors` is a **repeatable component list, not a region.**
 |
 | Each logo is grey until pointed at. The grey background is repeated on every
 | slide rather than left to the strip behind them: the logos blend with what is
 | under them, and Embla's transform on the track opens a stacking context that
 | the blend mode cannot see through. The static site's sidecar note records the
 | same finding, and the wrapper elements it says can go have gone.
 |
 */

import { use_auto_scrolling_strip } from "#infra/lib/ui/react/embla-carousel/use-auto-scrolling-strip.ts"

import type { Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import { Picture_Image } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

type Sponsor = {
	name?: string | null
	image?: Image_Attribute | null
}

export function Sponsors_List ( { sponsors = [] }: { sponsors?: Sponsor[] } ) {
	const origin = use_media_origin()

	// The organisation's name is what a visitor who cannot see the logo is
	// told, so it stands in wherever the picture carries no alternative text of
	// its own — which for a logo is the normal case.
	const slides = sponsors
		.map( ( sponsor ) => {
			const picture = picture_of( sponsor?.image, origin )

			return picture
				? { ...picture, alt: picture.alt || sponsor?.name || "" }
				: null
		} )
		.filter( ( picture ) => picture !== null )

	const { repeat_count, track_ref, viewport_ref } = use_auto_scrolling_strip(
		slides.length,
	)

	if ( slides.length === 0 ) {
		return null
	}

	return <div className={ `${BLOCK_SPACING} bg-gray-light` }>
		<div className="py-2.25 md:py-4 overflow-hidden" ref={ viewport_ref }>
			<ul
				className="flex gap-4.25 md:gap-16 [&>*:first-child]:ml-4.25 md:[&>*:first-child]:ml-16"
				ref={ track_ref }>
				{ Array.from( { length: repeat_count } ).flatMap( (
					_unused,
					repetition,
				) => slides.map( ( picture, index ) =>
					<li
						aria-hidden={ repetition > 0 }
						key={ `${repetition}-${index}` }>
						<figure
							className="size-17.5 md:size-26 grow-0 shrink-0 flex justify-center items-center bg-gray-light grayscale hover:grayscale-0 transition-[filter] ease-in duration-[190ms] overflow-hidden"
							style={ { mixBlendMode: "multiply" } }>
							<Picture_Image
								className="w-full object-contain"
								picture={ picture } />
						</figure>
					</li>
				) ) }
			</ul>
		</div>
	</div>
}
