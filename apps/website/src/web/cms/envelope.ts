
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
	 | The main event supplies the site chrome; the resolved event supplies
	 | colours, listing filters and the schedule document. Both arrive null
	 | until the Event content type exists.
	 |
	 */
	main_event: null
	resolved_event: null
}
