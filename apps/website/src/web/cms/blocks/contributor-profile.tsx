
/**
 |
 | Contributor profile — a leaf, and the whole of a contributor's page.
 |
 | Another block with **no component behind it.** Every component maps to one
 | block, and some blocks map to no component at all because they are built
 | from an entry's top-level attributes. This is the third of those: the
 | Masthead and the Session Details are the other two.
 |
 | It carries the document's `h1`, which is why root assembly leaves the
 | sidebar's title empty on a contributor — a name said twice is two first
 | headings saying the same thing.
 |
 | It owns the portrait-and-prose split. A contributor's page is defined by
 | that arrangement, and there is no version of it that does not have one, so
 | offering an editor a choice would be offering a way to make a page that
 | does not work.
 |
 */

import type { BlocksContent } from "@strapi/blocks-react-renderer"

import { BlocksRenderer } from "@strapi/blocks-react-renderer"

import type { Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { Picture_Image } from "../pictures.tsx"

import {
	H,
	Level,
} from "#infra/lib/ui/react/headings.tsx"

type Contributor_Profile_Props = {
	name: string
	role?: string | null
	image?: Image_Attribute | null
	blurb?: unknown
}

export function Contributor_Profile (
	{ blurb, image, name, role }: Contributor_Profile_Props,
) {
	const origin = use_media_origin()
	const picture = picture_of( image, origin )
	const prose = Array.isArray( blurb ) && blurb.length > 0
		? blurb as BlocksContent
		: null

	// The outer container mirrors what the main column's own padded box gives
	// every other content type. The block lives in the masthead slot — which
	// sits above that padded box, so the padding has to be drawn here.
	return <div className="md:w-9c py-8 md:py-16 text-black">
		<article className="cc mx-auto md:px-16 flex flex-col gap-6 md:gap-8 md:flex-row md:items-start">
			{ picture && <figure className="w-full md:w-64 shrink-0">
				<Picture_Image
					className="w-full aspect-square rounded-full object-cover grayscale"
					picture={ {
						...picture,
						alt: picture.alt || name,
					} } />
			</figure> }

		<div className="grow">
			<H className="text-h2 md:font-semibold text-context">
				{ name }
			</H>

			{ role
				&& <p className="mt-2 md:mt-4 text-p text-black font-semibold">
					{ role }
				</p> }

			{ prose && <div className="mt-6 md:mt-8 [&>*:first-child]:mt-0">
				<Level>
					<BlocksRenderer
						content={ prose }
						blocks={ {
							link: ( { children, url } ) =>
								<Nav_Link
									className="text-context underline underline-offset-3"
									url={ url }>
									{ children }
								</Nav_Link>,
							list: ( { children, format } ) =>
								format === "ordered"
									? <ol className="mt-4 pl-6 list-decimal text-p text-black">
										{ children }
									</ol>
									: <ul className="mt-4 pl-6 list-disc text-p text-black">
										{ children }
									</ul>,
							paragraph: ( { children } ) =>
								<p className="mt-4 text-p text-black">
									{ children }
								</p>,
							quote: ( { children } ) =>
								<blockquote className="my-6 md:my-8 pl-4 border-l-2 border-context text-h4 text-black">
									{ children }
								</blockquote>,
						} }
						modifiers={ {
							bold: ( { children } ) =>
								<strong className="font-semibold">
									{ children }
								</strong>,
							italic: ( { children } ) =>
								<em className="italic">{ children }</em>,
							strikethrough: ( { children } ) => <s>{ children }</s>,
							underline: ( { children } ) => <u>{ children }</u>,
						} } />
				</Level>
			</div> }
		</div>
		</article>
	</div>
}
