
/**
 |
 | Quote — a leaf. Somebody's words, and who said them.
 |
 | **The static site has two quote treatments, and this block is both.** On a
 | white page it is the first: a grey card with the portrait beside the words.
 | Over a dark ground it is the second: no card, no border, nothing behind the
 | words at all, the opening symbol set large above them and the attribution
 | plain underneath. That is the one the Archive's snapshot dialog draws.
 |
 | They are one block rather than two components because an editor did not
 | choose between them and should not have to: they chose a quotation, and where
 | it sits is what decides how it is drawn. The card is a card because the page
 | around it is white — put it on black and the grey plate is the only thing on
 | the slide. See `dark-surface.tsx`.
 |
 | The closing quotation mark is drawn by the design rather than typed, and so
 | is the opening one, so an editor types neither. Over a dark ground the
 | opening mark is a symbol above the words rather than one hanging into the
 | left margin, so the mark a screen reader would otherwise miss is spelled out
 | as a zero-sized character — the static site's own trick.
 |
 | **The portrait is not drawn over a dark ground.** The second treatment has
 | nowhere to put it: the words run the full width of the slide, and a square
 | photograph beside them is the first treatment's layout with its plate taken
 | away. An editor who fills one in on a snapshot gets the words without it.
 |
 */

import { Opening_Double_Quotes } from "#infra/lib/ui/react/icons/opening-double-quotes.tsx"

import type { Image_Attribute } from "../media.ts"

import { use_dark_surface } from "../dark-surface.tsx"
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
	const dark = use_dark_surface()

	if ( !quote ) {
		return null
	}

	if ( dark ) {
		return <Pull_Quote attribution={ attribution } quote={ quote } />
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

/**
 |
 | The second treatment, lifted from the static site's `Quote2` — the one its
 | archive dialog closes with.
 |
 | The words take the ground's colour through `currentColor` rather than naming
 | one, so the symbol above them and the attribution below match whatever is
 | around them without a third place to keep in step.
 |
 */
function Pull_Quote (
	{ attribution, quote }: { attribution?: string | null; quote: string },
) {
	return <figure className={ BLOCK_SPACING }>
		<blockquote>
			<Opening_Double_Quotes
				className="size-16 md:size-32"
				style={ { opacity: 0.35 } } />

			{
				/* The opening mark is the symbol above, which a screen reader
			     does not read as one. A zero-sized character puts it back into
			     the sentence for anything reading the words rather than
			     looking at them. */
			}
			<p className="mt-8 text-h3 font-semibold">
				<span className="text-[0px]">“</span>
				{ quote }
				”
			</p>
		</blockquote>

		{ attribution
			&& <figcaption className="mt-8 text-p">
				{ attribution }
			</figcaption> }
	</figure>
}
