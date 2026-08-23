
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
		main_event: null,
		page_shell: page_shell(),
		resolved_event: null,
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
