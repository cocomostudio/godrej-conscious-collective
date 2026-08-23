
/**
 |
 | Quote — a leaf. Somebody's words, and who said them.
 |
 | Lifted from the static site's first quote treatment. The closing quotation
 | mark is drawn by the design rather than typed, and the opening one is the
 | symbol that hangs into the left margin from the medium breakpoint upward, so
 | an editor types neither.
 |
 */

import { Opening_Double_Quotes } from "#infra/lib/ui/react/icons/opening-double-quotes.tsx"

import type { Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import { Picture_Image } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

type Quote_Props = {
	quote: string
	attribution?: string | null
	image?: Image_Attribute | null
}

export function Quote ( { attribution, image, quote }: Quote_Props ) {
	const picture = picture_of( image, use_media_origin() )

	if ( !quote ) {
		return null
	}

	return <figure
		className={ `${BLOCK_SPACING} rounded-lg border border-gray-light p-4 md:p-8 bg-gray-light grid grid-cols-[64px_1fr] items-center gap-4 md:gap-x-8 md:gap-y-4 md:grid-cols-[auto_auto_1fr] md:items-center` }>
		<div className="max-md:hidden size-16" aria-hidden={ true }></div>

		<blockquote className="relative col-span-2 md:col-span-1 md:self-end">
			<div className="md:absolute md:right-full">
				<Opening_Double_Quotes
					className="md:mr-8 md:size-16"
					style={ { opacity: 0.35 } } />
			</div>

			<p className="mt-4 md:m-0 text-h4 md:font-semibold after:content-['”']">
				{ quote }
			</p>
		</blockquote>

		{ picture
			&& <div className="md:col-start-1 md:row-start-1 md:row-span-2 w-16 md:order-first md:w-41 self-start">
				<Picture_Image
					className="object-cover rounded-lg aspect-square"
					picture={ picture } />
			</div> }

		{ attribution
			&& <figcaption className="md:col-start-3 md:row-start-2 max-md:pr-16 md:self-start text-caption">
				{ attribution }
			</figcaption> }
	</figure>
}
