
/**
 |
 | Envelopes shaped exactly as the CMS's envelope route returns them.
 |
 | Kept beside the website's tests rather than shared with the CMS's, because
 | the point of two seams is that each asserts its own side of the contract. If
 | these ever drift from what the route really sends, the CMS's own tests are
 | what catch it.
 |
 */

import type {
	Block,
	Entry,
	Envelope,
	Event,
	Link as Link_Attribute,
	Page_Shell,
} from "../../src/web/cms/envelope.ts"

let next_id = 1

function id () {
	next_id += 1
	return next_id
}

export function page_shell ( over: Partial<Page_Shell> = {} ): Page_Shell {
	return {
		navigation_footer: [],
		navigation_header: [],
		site_description: null,
		site_title: "Godrej Conscious Collective",
		...over,
	}
}

/**
 |
 | A festival edition. The colours arrive as RGB channel triplets because that
 | is what the CMS derives and what the colour tokens compile against; the hex
 | siblings ride along unread by anything the website renders.
 |
 */
export function event ( over: Partial<Event> = {} ): Event {
	return {
		colour_contributor_rgb: "255, 92, 35",
		colour_conversation_rgb: "0, 85, 230",
		colour_experience_rgb: "0, 225, 182",
		colour_showcase_rgb: "240, 80, 61",
		colour_theme_rgb: "0, 85, 230",
		colour_workshop_rgb: "250, 188, 29",
		date_end: "2025-12-14",
		date_start: "2025-12-11",
		documentId: `document-${id()}`,
		is_archived: false,
		main: true,
		name: "Conscious Collective 2025",
		schedule: null,
		...over,
	}
}

export function envelope (
	entry: Partial<Entry> = {},
	over: Partial<Envelope> = {},
): Envelope {
	return {
		entry: {
			contentType: "api::page.page",
			documentId: `document-${id()}`,
			main_region: [],
			page_layout: "two-column",
			side_region: [],
			standfirst: null,
			title: "A Page",
			toc: true,
			...entry,
		},
		main_event: event(),
		page_shell: page_shell(),
		resolved_event: event(),
		...over,
	}
}

export function section (
	title: string,
	{
		background_gradient,
		background_pattern,
		background_position,
		content = [],
		heading,
		horizontal_rule,
		link,
		opening_line,
		register_with_toc = false,
	}: {
		background_gradient?: string
		background_pattern?: string
		background_position?: string
		content?: Block[]
		heading?: {
			id?: number
			content: string
			level?: string
			link?: Link_Attribute | null
			register_with_toc?: boolean
		}
		horizontal_rule?: boolean
		link?: Link_Attribute | null
		opening_line?: string
		register_with_toc?: boolean
	} = {},
): Block {
	return {
		__component: "container.section-v1",
		background_gradient,
		background_pattern,
		background_position,
		content,
		heading,
		horizontal_rule,
		id: id(),
		link,
		opening_line,
		register_with_toc,
		title,
	}
}

/* _____
 | The catalogue.
 |
 | Every builder below produces the node the CMS's envelope route really sends
 | for that component, which is the contract these tests are here to hold.
 |
 */

export function image (
	url: string,
	over: Record<string, unknown> = {},
): Record<string, unknown> {
	return { alt: "", caption: null, file: null, title: null, url, ...over }
}

export function responsive_image (
	url: string,
	over: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		large: null,
		medium: null,
		small: image( url, over ),
	}
}

export function image_block (
	url: string,
	over: Record<string, unknown> = {},
): Block {
	return { __component: "media.image-v1", id: id(), ...image( url, over ) }
}

export function responsive_image_block ( url: string ): Block {
	return {
		__component: "media.responsive-image-v1",
		id: id(),
		...responsive_image( url ),
	}
}

export function image_link (
	url: string,
	label: string,
	image_url: string,
): Record<string, unknown> {
	return { image: responsive_image( image_url ), label, url }
}

export function link ( url: string, label: string, style = "plain" ): Block {
	return { __component: "navigation.link-v1", id: id(), label, style, url }
}

export function wysiwyg ( ...paragraphs: string[] ): Block {
	return {
		__component: "text.wysiwyg-v1",
		id: id(),
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
): Block {
	return {
		__component: "text.quote-v1",
		attribution,
		id: id(),
		image: image_url ? image( image_url ) : null,
		quote: quote_text,
	}
}

export function marquee ( ...items: string[] ): Block {
	return {
		__component: "text.marquee-v1",
		id: id(),
		// A repeatable component list: no `__component` on its members, which
		// is what keeps the renderer from walking into it as a region.
		items: items.map( ( content ) => ( { content, id: id() } ) ),
	}
}

export function gallery ( layout: string, ...urls: string[] ): Block {
	return {
		__component: "media.gallery-v1",
		id: id(),
		images: urls.map( ( url ) => image( url, { title: url } ) ),
		layout,
	}
}

export function google_map (
	over: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		address: "Plant 13, Vikhroli",
		image: null,
		label: null,
		map_url: "https://example.com/maps/plant-13",
		...over,
	}
}

export function google_map_block ( over: Record<string, unknown> = {} ): Block {
	return {
		__component: "media.google-map-v1",
		id: id(),
		...google_map( over ),
	}
}

export function sponsors_list (
	...sponsors: { name: string; url: string }[]
): Block {
	return {
		__component: "list.sponsors-list-v1",
		id: id(),
		sponsors: sponsors.map( ( sponsor ) => ( {
			id: id(),
			image: image( sponsor.url ),
			name: sponsor.name,
		} ) ),
	}
}

export function profile_list (
	...profiles: { name: string; role: string; description: string }[]
): Block {
	return {
		__component: "list.profile-list-v1",
		id: id(),
		profiles: profiles.map( ( profile ) => ( {
			...profile,
			id: id(),
			image: image( "/uploads/portrait.png" ),
		} ) ),
	}
}

export function vanilla_carousel (
	...slides: ReturnType<typeof image_link>[]
): Block {
	return { __component: "media.vanilla-carousel-v1", id: id(), slides }
}

export function instagram_feed (
	...slides: ReturnType<typeof image_link>[]
): Block {
	return { __component: "media.instagram-feed-v1", id: id(), slides }
}

export function horizontal_rule ( shade = "light" ): Block {
	return { __component: "miscellaneous.horizontal-rule-v1", id: id(), shade }
}

export function image_and_content (
	image_url: string,
	content: Block[],
	layout = "image-left",
): Block {
	return {
		__component: "container.image-and-content-v1",
		content,
		id: id(),
		image: image( image_url ),
		layout,
	}
}

export function image_stack_and_content (
	urls: string[],
	content: Block[],
	layout = "images-left",
): Block {
	return {
		__component: "container.image-stack-and-content-v1",
		content,
		id: id(),
		images: urls.map( ( url ) => responsive_image( url ) ),
		layout,
	}
}

export function map_and_content (
	map: Record<string, unknown>,
	content: Block[],
	layout = "map-left",
): Block {
	return {
		__component: "container.map-and-content-v1",
		content,
		id: id(),
		layout,
		map,
	}
}

export function script ( code: string ): Block {
	return {
		__component: "code.script-v1",
		code,
		id: id(),
		src: null,
		type: "text/javascript",
	}
}

export function html_document_hooks (
	regions: Record<string, Block[]>,
): Record<string, unknown> {
	return {
		after_body_opening: [],
		before_body_closing: [],
		before_head_closing: [],
		...regions,
	}
}

export function plain_string ( content: string ): Block {
	return { __component: "text.plain-string-v1", content, id: id() }
}

export function heading (
	content: string,
	{
		level = "h2",
		register_with_toc = false,
	}: { level?: string; register_with_toc?: boolean } = {},
): Block {
	return {
		__component: "text.heading-v1",
		content,
		id: id(),
		level,
		register_with_toc,
	}
}

/**
 |
 | A component the CMS holds and the website has never heard of. The catalogue
 | grows in the CMS first, routinely, for the whole of this build.
 |
 */
export function unknown_component (): Block {
	return { __component: "media.something-not-built-yet-v1", id: id() }
}
