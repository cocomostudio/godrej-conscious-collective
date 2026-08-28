
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
import type { CSSProperties } from "react"

import { BlocksRenderer } from "@strapi/blocks-react-renderer"

import type { Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { Picture_Image } from "../pictures.tsx"

import { with_nested_lists_normalised } from "./rich-text-nesting.ts"

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

	const span_4c =
		"calc( ( 4 * var( --column-width ) ) + ( 4 * var( --gutter-x ) ) )"
	const linear_gradient = [
		"to right",
		"rgb( var( --ctx-context-color ) )",
		`rgb( 255, 255, 255, 0 ) ${span_4c}`,
	].join( ", " )

	// The outer container mirrors the container a section introduces for every
	// other content type — nine columns of the main column's nine-and-two, and
	// the same inset inside them. The block lives in the masthead slot, above
	// where any section sits, so it draws that itself.
	//
	// **Portrait on top, then the name and role, then the prose** — the same
	// stack at every width. The static site does exactly this on the single
	// collaborator page: the picture leads, and the words fall below it.
	return <div
		className="md:w-9c text-black md:bg-[linear-gradient(var(--linear-gradient))]"
		style={ { "--linear-gradient": linear_gradient } as CSSProperties }>
		<article className="md:flex md:gap-16 md:p-16">
			<div className="pt-6 md:p-0 md:w-3c1g shrink-0 bg-gradient-to-b from-context to-[rgba(255,255,255,0)] md:bg-none">
				{ picture && <figure className="w-full shrink-0">
					<Picture_Image
						className="w-full aspect-square rounded-full object-cover grayscale"
						picture={ {
							...picture,
							alt: picture.alt || name,
						} } />
				</figure> }
				<H className="max-md:hidden mt-8 text-h4 font-semibold text-black text-center">
					{ name }
				</H>
				{ role
					&& <p className="max-md:hidden mt-2 text-h5 text-black text-center">
						{ role }
					</p> }
			</div>

			{ prose && <div className="mt-8 pb-8 md:m-0 md:pb-0 space-y-4">
				<Level>
					{
						/*
					 | **The nesting pass, and only the nesting pass**, is
					 | shared with the WYSIWYG. Valid markup should not
					 | depend on which block happened to render the rich
					 | text, so one module answers for both.
					 |
					 | The rest of that block's treatment — the spacing, the
					 | nested card, the rhombus, `---` — is not shared, and a
					 | blurb still draws its own way.
					 */
					}
					<BlocksRenderer
						content={ with_nested_lists_normalised( prose ) }
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
								<em className="italic">
									{ children }
								</em>,
							strikethrough: ( { children } ) =>
								<s>{ children }</s>,
							underline: ( { children } ) =>
								<u>{ children }</u>,
						} } />
				</Level>
			</div> }
		</article>
	</div>
}
