
/**
 |
 | What the CMS hands over for a page.
 |
 | One request, one envelope, one cache key. The entry arrives populated to the
 | bottom of the render tree and **ready to walk** — the website assembles the
 | root and nothing else.
 |
 */

/**
 |
 | A node in the render tree.
 |
 | `__component` is the discriminator. Every component the CMS holds carries one;
 | a repeatable component list provably does not, which is what keeps a list of
 | rows from being mistaken for a region.
 |
 */
export type Block = {
	__component: string
	id?: number
	[attribute: string]: unknown
}

export type Link = {
	label: string | null
	url: string
	style: "plain" | "button"
}

export type Page_Shell = {
	site_title: string | null
	site_description: string | null
	navigation_header: Link[]
	navigation_footer: Link[]
	[attribute: string]: unknown
}

/**
 |
 | A file the CMS holds, populated rather than left as a relation id. Only the
 | few attributes anything here reads are named.
 |
 */
export type Media = {
	url: string
	name?: string | null
	ext?: string | null
	size?: number | null
	[attribute: string]: unknown
}

/**
 |
 | A festival edition.
 |
 | It arrives twice in every envelope and the two copies mean different things.
 | As the **main event** it is the site chrome's source — the header's date
 | range, the Register Now button, the footer's date line — and it is the same
 | on every page of the site. As the **resolved event** it is this page's own
 | context: its colours, its listing filters and its schedule document.
 |
 | The six colours arrive twice as well. `colour_*` is what the editor picked
 | and nothing here reads it; `colour_*_rgb` is the same colour as three bare
 | channels, derived by the CMS on save, and that is what the colour tokens
 | compile against.
 |
 */
export type Event = {
	documentId: string
	name: string
	main: boolean
	date_start: string | null
	date_end: string | null
	is_archived: boolean
	schedule: Media | null
	colour_theme_rgb: string | null
	colour_showcase_rgb: string | null
	colour_experience_rgb: string | null
	colour_conversation_rgb: string | null
	colour_workshop_rgb: string | null
	colour_contributor_rgb: string | null
	[attribute: string]: unknown
}

export type Entry = {
	contentType: string
	documentId: string
	title: string
	standfirst: string | null
	page_layout: Page_Layout
	toc: boolean
	main_region: Block[]
	side_region: Block[]
	[attribute: string]: unknown
}

export const PAGE_LAYOUTS = [ "one-column", "two-column" ] as const

export type Page_Layout = typeof PAGE_LAYOUTS[number]

export type Envelope = {
	entry: Entry
	page_shell: Page_Shell | null
	/**
	 |
	 | The site chrome follows the **main event**, on every page, always,
	 | including archived ones — so a visitor arriving on an old page through an
	 | old link still has a route to the festival that is actually running.
	 |
	 | Everything else event-derived follows the **resolved event**: the entry's
	 | own event, failing that the main event. Colours have a third level below
	 | that, a hardcoded palette, because either slot may be null.
	 |
	 | Both are null when no event answers, and the chrome degrades rather than
	 | failing.
	 |
	 */
	main_event: Event | null
	resolved_event: Event | null
}
