
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
		content = [],
		heading,
		register_with_toc = false,
	}: {
		content?: Block[]
		heading?: {
			id?: number
			content: string
			level?: string
			register_with_toc?: boolean
		}
		register_with_toc?: boolean
	} = {},
): Block {
	return {
		__component: "container.section-v1",
		content,
		heading,
		id: id(),
		register_with_toc,
		title,
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
