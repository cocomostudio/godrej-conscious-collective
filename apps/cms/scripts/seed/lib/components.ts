
/**
 |
 | The catalogue.
 |
 | Every helper here writes one component of the catalogue, in the shape the
 | document service wants it — the leaves an editor picks from a dynamic zone,
 | and the `section` container that holds them. They are what the content-type
 | files one level up are written in, which is why they live in one place: a
 | component whose shape is spelled out twice is a component that can be
 | spelled out twice differently.
 |
 | Images are written as bare urls rather than as uploaded files: the image
 | component carries a `url` beside its `file` precisely so that no picture has
 | to be stored in this repository. The exceptions are in `uploads.ts`.
 |
 */

import { rich_text_from_markdown } from "./markdown.ts"

export type Image_Fields = {
	url: string
	title?: string
	caption?: string
	alt?: string
}

export function image ( { alt = "", caption, title, url }: Image_Fields ) {
	return { alt, caption, title, url }
}

/**
 |
 | The same picture at all three widths.
 |
 | Art direction is the exception rather than the rule, and the website falls
 | back from any missing width to the nearest one that was filled in — so a
 | responsive image with one crop is a legitimate shape and the one the seed
 | writes.
 |
 */
export function responsive_image ( fields: Image_Fields ) {
	return { small: image( fields ) }
}

/**
 |
 | The other shape a responsive image comes in: a different crop at each of the
 | three widths.
 |
 | The exception rather than the rule, and seeded once, because a responsive
 | image with one crop and a responsive image with three go down different
 | branches of the website's fallback — and a component only ever seeded with
 | one crop would leave the branch that art direction exists for untested.
 |
 | The words belong to the picture rather than to the crop, so all three carry
 | the same ones. The website reads them off the small crop, which is the one it
 | never hides.
 |
 */
export function art_directed_image (
	{ alt, caption, large, medium, small, title }:
		& Omit<Image_Fields, "url">
		& { small: string; medium?: string; large?: string },
) {
	const words = { alt, caption, title }

	return {
		large: image( { ...words, url: large } ),
		medium: image( { ...words, url: medium } ),
		small: image( { ...words, url: small } ),
	}
}

/**
 |
 | The image component as a block in its own right, rather than as an attribute
 | of a composite.
 |
 */
export function image_block ( fields: Image_Fields ) {
	return { __component: "media.image-v1", ...image( fields ) }
}

export function responsive_image_block (
	fields: Parameters<typeof art_directed_image>[0],
) {
	return {
		__component: "media.responsive-image-v1",
		...art_directed_image( fields ),
	}
}

/**
 |
 | The same three crops, drawn edge to edge.
 |
 | `spacing_around` is left off where it is not given, so the seed exercises the
 | schema's own default rather than restating it.
 |
 */
export function full_bleed_image_block (
	fields: Parameters<typeof art_directed_image>[0],
	spacing_around?: string,
) {
	return {
		__component: "media.full-bleed-image-v1",
		...art_directed_image( fields ),
		...( spacing_around ? { spacing_around } : {} ),
	}
}

export function image_link ( url: string, label: string, image_url: string ) {
	return {
		image: responsive_image( { alt: label, url: image_url } ),
		label,
		url,
	}
}

/**
 |
 | The component, given rich text already assembled. The two helpers below are
 | the two ways this seed assembles it, and they share this so that the
 | discriminator is written down once.
 |
 */
function wysiwyg_of ( rich_text: unknown[] ) {
	return { __component: "text.wysiwyg-v1", rich_text }
}

export function wysiwyg ( paragraphs: string[] ) {
	return wysiwyg_of( paragraphs.map( ( paragraph ) => ( {
		children: [ { text: paragraph, type: "text" } ],
		type: "paragraph",
	} ) ) )
}

/**
 |
 | The same component, written as markdown.
 |
 | A passage of headings, lists and nesting is unreadable as Strapi's node tree
 | and unreviewable in a diff, so it is written as markdown and parsed here. The
 | parser is a development-only dependency and this is the only thing that
 | reaches it — see `markdown.ts` for what it does and does not accept.
 |
 | The plain helper above stays for the many sections that are a run of
 | paragraphs and nothing more, where markdown would be ceremony around a list
 | of strings.
 |
 */
export function wysiwyg_from_markdown ( source: string ) {
	return wysiwyg_of( rich_text_from_markdown( source ) )
}

export function quote (
	quote_text: string,
	attribution: string,
	image_url?: string,
) {
	return {
		__component: "text.quote-v1",
		attribution,
		quote: quote_text,
		...( image_url ? { image: image( { url: image_url } ) } : {} ),
	}
}

export function marquee ( items: string[], spacing_around?: string ) {
	return {
		__component: "text.marquee-v1",
		items: items.map( ( content ) => ( { content } ) ),
		...( spacing_around ? { spacing_around } : {} ),
	}
}

export function gallery (
	layout: "equal" | "wide-first",
	images: Image_Fields[],
) {
	return {
		__component: "media.gallery-v1",
		images: images.map( image ),
		layout,
	}
}

export function google_map (
	{ alt, caption, image_url, place_url }: {
		place_url: string
		alt?: string
		caption?: string
		image_url?: string
	},
) {
	return {
		place_url,
		...( image_url
			? {
				image: image( {
					alt: alt ?? "",
					caption,
					url: image_url,
				} ),
			}
			: {} ),
	}
}

/**
 |
 | A slide, in the shape both carousels want it.
 |
 | Written out rather than taken from the seed's own list of slides, so that
 | the catalogue describes the component's shape rather than borrowing it from
 | one body of sample content.
 |
 */
export type Slide = { image: string; label: string; url: string }

export function vanilla_carousel ( slides: Slide[] ) {
	return {
		__component: "media.vanilla-carousel-v1",
		slides: slides.map( ( slide ) =>
			image_link( slide.url, slide.label, slide.image )
		),
	}
}

/**
 |
 | The colour a component draws its words in. Left off where it is not given, so
 | the seed lands on the schema's default — which is `auto`, meaning nobody
 | answered, and which leaves the website to draw whatever that component draws
 | where nobody has: the page's own colour for a heading and a link, and black
 | for a plain string and a WYSIWYG's prose.
 |
 | `auto` is spellable here even so. Omitting the attribute and passing it are
 | the same thing, and a seed that wants to say "deliberately unanswered" out
 | loud should be able to.
 |
 */
export type Text_Color = "auto" | "context" | "theme" | "black" | "white"

export function link (
	label: string,
	url: string,
	style: "plain" | "button" = "plain",
	text_color?: Text_Color,
) {
	return { label, style, url, ...( text_color ? { text_color } : {} ) }
}

/**
 |
 | A plain string as an ordinary component attribute — a section's opening
 | line. It carries no `__component`, for the same reason the heading beside it
 | does not: it is not a choice an editor made from a dynamic zone.
 |
 */
export function plain_string_component (
	content: string,
	text_color?: Text_Color,
) {
	return { content, ...( text_color ? { text_color } : {} ) }
}

/**
 |
 | The same component as an entry in a dynamic zone, where the discriminator is
 | what tells Strapi which component was chosen.
 |
 */
export function plain_string ( content: string, text_color?: Text_Color ) {
	return {
		__component: "text.plain-string-v1",
		...plain_string_component( content, text_color ),
	}
}

export type Level = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

/**
 |
 | A heading as an ordinary component attribute — a section's own heading. It
 | carries no `__component`, because it is not a choice an editor made from a
 | dynamic zone.
 |
 */
export function heading_component (
	content: string,
	level: Level,
	register_with_toc = false,
	text_color?: Text_Color,
) {
	return {
		content,
		level,
		register_with_toc,
		...( text_color ? { text_color } : {} ),
	}
}

/**
 |
 | The same component as an entry in a dynamic zone, where the discriminator is
 | what tells Strapi which component was chosen.
 |
 */
export function heading (
	content: string,
	level: Level,
	register_with_toc = false,
	text_color?: Text_Color,
) {
	return {
		__component: "text.heading-v1",
		...heading_component( content, level, register_with_toc, text_color ),
	}
}

export function section (
	title: string,
	{
		background_gradient,
		background_pattern,
		background_position,
		blocks = [] as any[],
		heading: section_heading,
		horizontal_rule,
		link: section_link,
		opening_line,
		register_with_toc = false,
		spacing_around,
		strings = [] as string[],
	}: {
		background_gradient?: string
		background_pattern?: string
		background_position?: string
		/** Catalogue components, after whatever `strings` contributed. */
		blocks?: any[]
		heading?: ReturnType<typeof heading_component>
		horizontal_rule?: boolean
		link?: ReturnType<typeof link>
		opening_line?: ReturnType<typeof plain_string_component>
		register_with_toc?: boolean
		spacing_around?: string
		strings?: string[]
	},
) {
	return {
		__component: "container.section-v1",
		content: [ ...strings.map( s => plain_string( s ) ), ...blocks ],
		// Present-but-undefined is not the same as absent here: the document
		// service reads the key, builds an empty heading component from it, and
		// then refuses the whole entry because that component's required
		// `content` is null.
		...( section_heading ? { heading: section_heading } : {} ),
		...( section_link ? { link: section_link } : {} ),
		...( background_gradient ? { background_gradient } : {} ),
		...( background_pattern ? { background_pattern } : {} ),
		...( background_position ? { background_position } : {} ),
		...( horizontal_rule === undefined ? {} : { horizontal_rule } ),
		...( opening_line ? { opening_line } : {} ),
		...( spacing_around ? { spacing_around } : {} ),
		register_with_toc,
		title,
	}
}
