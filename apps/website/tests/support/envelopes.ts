
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
	Contributor_Card,
	Contributor_Entry,
	Envelope,
	Event,
	Link as Link_Attribute,
	Page_Entry,
	Page_Shell,
	Session_Card,
	Session_Entry,
	Session_Schedule_Row,
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
 | One run of the programme. The colours arrive as RGB channel triplets because
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
	entry: Partial<Page_Entry> = {},
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

/**
 |
 | A session's envelope.
 |
 | A session carries none of a Page's `title`, `toc` or `side_region`, and a
 | fair number of attributes no other content type has. Its own builder rather
 | than an override on the Page's, so that a caller reaching for a session gets
 | a session's defaults and nothing of a Page's.
 |
 | The compiler will not hold the two apart on its own: `Entry` carries an index
 | signature, because an entry has more attributes than the website reads, and
 | that signature is what lets a `Partial` of either accept the other's keys.
 | Two builders is the whole of the separation.
 |
 */
export function session_envelope (
	entry: Partial<Session_Entry> = {},
	over: Partial<Envelope> = {},
): Envelope {
	return {
		entry: {
			age_group: "All",
			all_day_event: false,
			category: "Showcase",
			checkout_url: null,
			contentType: "api::session.session",
			cover: null,
			documentId: `document-${id()}`,
			instances: [ instance( "2025-12-11", "10:00", "12:30" ) ],
			main_region: [],
			name: "A Session",
			price: null,
			session_date_first: "2025-12-11",
			session_date_last: "2025-12-11",
			standfirst: null,
			venue: null,
			...entry,
		},
		main_event: event(),
		page_shell: page_shell(),
		resolved_event: event(),
		...over,
	}
}

/**
 |
 | A collaborator's envelope.
 |
 | A contributor page has no `page_layout`, no region, and none of the sidebar
 | scaffolding a Page carries. The four content attributes the ContributorProfile
 | reads are all this builder fills in — plus the standard `documentId` — and a
 | caller wanting to leave one out passes it as `null`.
 |
 */
export function contributor_envelope (
	entry: Partial<Contributor_Entry> = {},
	over: Partial<Envelope> = {},
): Envelope {
	return {
		entry: {
			blurb: null,
			contentType: "api::contributor.contributor",
			documentId: `document-${id()}`,
			image: null,
			main_region: [],
			name: "A Collaborator",
			role: null,
			standfirst: null,
			...entry,
		},
		main_event: event(),
		page_shell: page_shell(),
		resolved_event: event(),
		...over,
	}
}

/**
 |
 | One instance, with the event's own offset spelled out. Both ends are
 | datetimes even for an all-day session — the stored shape does not change,
 | which is what the eventual Add to Calendar output needs.
 |
 */
export function instance ( day: string, from: string, to: string ) {
	return {
		id: id(),
		time_end: `${day}T${to}:00.000+05:30`,
		time_start: `${day}T${from}:00.000+05:30`,
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
		spacing_around,
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
			text_color?: string | null
		}
		horizontal_rule?: boolean
		link?: Link_Attribute | null
		opening_line?: string
		register_with_toc?: boolean
		spacing_around?: string
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
		spacing_around,
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

export function full_bleed_image_block (
	url: string,
	over: Record<string, unknown> = {},
): Block {
	return {
		__component: "media.full-bleed-image-v1",
		id: id(),
		...responsive_image( url, over ),
	}
}

/**
 |
 | The same block, with an editor's `spacing_around` on it.
 |
 | Three components in the catalogue carry the attribute and one builder over
 | all of them keeps the tests from growing a spacing argument each — it is one
 | scalar and it means the same thing wherever it sits.
 |
 */
export function spaced (
	block: Block,
	spacing_around: string | null,
): Block {
	return { ...block, spacing_around }
}

/**
 |
 | The same block, in the colour an editor picked for its words.
 |
 | One builder over all four of the components that carry `text_color`, for the
 | same reason `spaced` is one over every component that carries
 | `spacing_around`: it is one scalar and it means the same thing wherever it
 | sits.
 |
 */
export function coloured (
	block: Block,
	text_color: string | null,
): Block {
	return { ...block, text_color }
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

/**
 |
 | Rich text with a heading in it, which is where a WYSIWYG's two colours part
 | company: the prose follows `text_color` and the heading inside does not.
 |
 */
export function wysiwyg_with_a_heading (
	heading_text: string,
	...paragraphs: string[]
): Block {
	const block = wysiwyg( ...paragraphs )

	return {
		...block,
		rich_text: [
			{
				children: [ { text: heading_text, type: "text" } ],
				level: 2,
				type: "heading",
			},
			...block.rich_text as unknown[],
		],
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

/* _____
 | Listings.
 |
 | The rows are what the CMS **spliced in**, not what an editor stored: a
 | listing leaves the envelope route holding narrowed rows whether an editor
 | curated it or the event filled it, which is the contract these builders hold.
 |
 | So there is one row builder per content type and three component builders
 | over it, rather than a curated shape and an automatic one.
 |
 */

export function session_card (
	over: Partial<Session_Card> = {},
): Session_Card {
	return {
		age_group: "All",
		category: "Showcase",
		contributors: [],
		cover: null,
		documentId: `document-${id()}`,
		name: "A Session",
		path: "/sessions/a-session",
		price: null,
		session_date_first: "2025-12-11",
		session_date_last: "2025-12-11",
		standfirst: null,
		...over,
	}
}

/**
 |
 | A schedule row: a card's row plus the hours.
 |
 | Its own builder rather than an override on the card's, because the two are
 | genuinely different shapes — the schedule is the one listing read hour by
 | hour, and the instances are why.
 |
 */
export function session_schedule_row (
	over: Partial<Session_Schedule_Row> = {},
): Session_Schedule_Row {
	return {
		...session_card(),
		all_day_event: false,
		instances: [ instance( "2025-12-11", "10:00", "12:30" ) ],
		...over,
	}
}

export function contributor_card (
	over: Partial<Contributor_Card> = {},
): Contributor_Card {
	return {
		documentId: `document-${id()}`,
		image: null,
		name: "A Collaborator",
		path: "/collaborators/a-collaborator",
		role: null,
		...over,
	}
}

export function session_listing (
	category: string,
	sessions: Session_Card[],
	count = sessions.length,
): Block {
	return {
		__component: "list.session-listing-v1",
		category,
		count,
		id: id(),
		sessions,
	}
}

/**
 |
 | The category listing pages' listing. **No count** — it holds the whole of
 | its category, which is what makes it the one uncapped listing.
 |
 */
export function session_listing_with_filtration (
	category: string,
	sessions: Session_Card[],
): Block {
	return {
		__component: "list.session-listing-with-filtration-v1",
		category,
		id: id(),
		sessions,
	}
}

/**
 |
 | The schedule page's list. The schedule document is spliced onto the node by
 | the CMS beside the rows, so it is a property of the component here rather
 | than something the block reads off the event.
 |
 */
export function session_schedule_list (
	sessions: Session_Schedule_Row[],
	schedule: Record<string, unknown> | null = null,
): Block {
	return {
		__component: "list.session-schedule-list-v1",
		id: id(),
		schedule,
		sessions,
	}
}

export function session_list ( sessions: Session_Card[] ): Block {
	return {
		__component: "list.session-list-v1",
		id: id(),
		sessions,
	}
}

export function contributor_listing (
	layout: string,
	contributors: Contributor_Card[],
	count = contributors.length,
): Block {
	return {
		__component: "list.contributor-listing-v1",
		contributors,
		count,
		id: id(),
		layout,
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
