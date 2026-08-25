
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

export function image_link ( url: string, label: string, image_url: string ) {
	return {
		image: responsive_image( { alt: label, url: image_url } ),
		label,
		url,
	}
}

export function wysiwyg ( paragraphs: string[] ) {
	return {
		__component: "text.wysiwyg-v1",
		rich_text: paragraphs.map( ( paragraph ) => ( {
			children: [ { text: paragraph, type: "text" } ],
			type: "paragraph",
		} ) ),
	}
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
	{ address, image_url, label, map_url }: {
		address: string
		map_url: string
		label?: string
		image_url?: string
	},
) {
	return {
		address,
		label,
		map_url,
		...( image_url
			? {
				image: responsive_image( {
					alt: "Location map",
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

export function link (
	label: string,
	url: string,
	style: "plain" | "button" = "plain",
) {
	return { label, style, url }
}

export function plain_string ( content: string ) {
	return { __component: "text.plain-string-v1", content }
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
) {
	return { content, level, register_with_toc }
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
) {
	return {
		__component: "text.heading-v1",
		...heading_component( content, level, register_with_toc ),
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
		opening_line?: string
		register_with_toc?: boolean
		spacing_around?: string
		strings?: string[]
	},
) {
	return {
		__component: "container.section-v1",
		content: [ ...strings.map( plain_string ), ...blocks ],
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
