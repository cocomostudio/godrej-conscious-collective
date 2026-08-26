
/**
 |
 | WYSIWYG — a leaf, and the one place an editor gets formatting.
 |
 | Its attribute is `rich_text` rather than `content`, so that `content` names a
 | region everywhere in this catalogue and never a string. The renderer only
 | walks a `content` that is an array of blocks, and the distinction is one an
 | attribute name should not be able to blur.
 |
 | Headings inside rich text go through the accessible-headings component like
 | every other heading on the page: the editor's chosen level picks how large it
 | looks, and its rank in the document follows from how deeply this block is
 | nested. Code blocks are rendered as monospaced paragraphs — the editor offers
 | them and the design has nowhere to put them.
 |
 | **`text_color` is the colour of the prose** — paragraphs, lists, quotations
 | and code. The headings and links inside keep the page's own colour, and so
 | does the quotation's rule.
 |
 | The alternative was to colour the whole block, and it was rejected on the
 | shape of the data rather than on taste: this block has drawn two colours
 | since it was written, three enum values cannot say "mixed", and whichever
 | single value became the default would repaint every WYSIWYG already saved —
 | prose in the context colour, or every rich-text heading in black. Prose is
 | the half the attribute governs because the context colour on a heading or a
 | link is what marks it out as one.
 |
 | **The cost is real and worth naming**: a block set to `white` over a dark
 | ground draws its subheadings in the context colour, and an editor cannot
 | say otherwise. If that shows up in a design, the fix is the whole block
 | following the attribute and a one-off migration writing `context` onto
 | every WYSIWYG that predates it — not a second attribute.
 |
 */

import {
	type BlocksContent,
	BlocksRenderer,
} from "@strapi/blocks-react-renderer"

import { H } from "#infra/lib/ui/react/headings.tsx"

import type { Media } from "../envelope.ts"

import {
	use_dark_surface,
	use_text_colour_class,
} from "../dark-surface.tsx"
import { use_media_origin } from "../media-origin.tsx"
import { use_body_text_class } from "../page-layout.tsx"
import { picture_of } from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { Picture_Image } from "../pictures.tsx"

import type { Text_Color } from "./text-color.ts"

import { BLOCK_SPACING } from "./block-spacing.ts"

const HEADING_SIZES: Record<number, string> = {
	1: "text-h1",
	2: "text-h2",
	3: "text-h3",
	4: "text-h4",
	5: "text-h5",
	6: "text-h6",
}

type Wysiwyg_Props = {
	rich_text?: BlocksContent
	text_color?: Text_Color
}

export function Wysiwyg ( { rich_text, text_color }: Wysiwyg_Props ) {
	const origin = use_media_origin()
	const body_size = use_body_text_class()
	// Over a dark ground the default flips to white, and so does a stored
	// `black` — see the note in `dark-surface.tsx` for why that one is not a
	// choice being overridden.
	const prose = use_text_colour_class( text_color, "black" )
	// The headings inside rich text are the context colour on a white page,
	// which is what marks them out as headings. The dialog is black and the
	// context colour is the event’s own, so they stay legible — except that a
	// heading there opens a slide, and the design draws that in plain white.
	const headings = use_dark_surface() ? "text-white" : "text-context"

	if ( !Array.isArray( rich_text ) || rich_text.length === 0 ) {
		return null
	}

	return <div
		className={ `${BLOCK_SPACING} [&>*:first-child]:mt-0` }>
		<BlocksRenderer
			content={ rich_text }
			blocks={ {
				code: ( { children } ) =>
					<p
						className={ `mt-4 ${body_size} font-mono ${prose}` }>
						{ children }
					</p>,
				heading: ( { children, level } ) =>
					<H
						className={ `mt-6 md:mt-8 ${
							HEADING_SIZES[level] ?? HEADING_SIZES[2]
						} md:font-semibold ${headings}` }>
						{ children }
					</H>,
				image: ( { image } ) => {
					// The renderer's own image node is the upload's row,
					// which is what the media helper wants — the two types
					// describe the same thing and neither package knows the
					// other's name for it.
					const picture = picture_of(
						{ file: image as unknown as Media },
						origin,
					)

					return picture
						? <figure className="my-6 md:my-8">
							<Picture_Image
								className="w-full rounded-lg object-cover"
								picture={ picture } />
						</figure>
						: null
				},
				link: ( { children, url } ) =>
					<Nav_Link
						className="text-context underline underline-offset-3"
						url={ url }>
						{ children }
					</Nav_Link>,
				list: ( { children, format } ) =>
					format === "ordered"
						? <ol
							className={ `mt-4 pl-6 list-decimal ${body_size} ${prose}` }>
							{ children }
						</ol>
						: <ul
							className={ `mt-4 pl-6 list-disc ${body_size} ${prose}` }>
							{ children }
						</ul>,
				paragraph: ( { children } ) =>
					<p className={ `mt-4 ${body_size} ${prose}` }>
						{ children }
					</p>,
				quote: ( { children } ) =>
					<blockquote
						className={ `my-6 md:my-8 pl-4 border-l-2 border-context text-h4 ${prose}` }>
						{ children }
					</blockquote>,
			} }
			modifiers={ {
				bold: ( { children } ) =>
					<strong className="font-semibold">
						{ children }
					</strong>,
				code: ( { children } ) =>
					<span className="font-mono">
						{ children }
					</span>,
				italic: ( { children } ) =>
					<em className="italic">
						{ children }
					</em>,
				strikethrough: ( { children } ) => <s>{ children }</s>,
				underline: ( { children } ) => <u>{ children }</u>,
			} } />
	</div>
}
