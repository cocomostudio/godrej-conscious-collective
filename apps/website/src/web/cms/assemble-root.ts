
/**
 |
 | Root assembly — the single transformation the website performs.
 |
 | A Strapi entry hands over flat sibling attributes. Something has to turn
 | those into a root block holding a sidebar and a main column, and that
 | something has to know what a sidebar is, what a back link says and what a
 | masthead looks like. All three are the website's business, not the CMS's.
 |
 | Everything **below** the root arrives ready to walk and is passed through
 | untouched.
 |
 | The root is an ordinary block: it goes through the same registry and the same
 | renderer as anything the CMS sent. It just has no component behind it —
 | which is a category the render tree already has, and which the Masthead and
 | the ContributorProfile will join.
 |
 */

import type {
	Block,
	Entry,
	Envelope,
	Event,
	Page_Layout,
	Page_Shell,
} from "./envelope.ts"
import type { Table_Of_Contents } from "./table-of-contents.ts"

import { context_colours } from "./context-colours.ts"
import {
	collect_table_of_contents,
	EMPTY_TABLE_OF_CONTENTS,
} from "./table-of-contents.ts"

/**
 |
 | The one layout that renders no sidebar. Named because two files ask the
 | question and a bare string in both is a rule spelled twice.
 |
 */
export const ONE_COLUMN: Page_Layout = "one-column"

export const ROOT = "this.root-v1"
export const BACK_LINK = "this.back-link-v1"
export const TABLE_OF_CONTENTS = "this.table-of-contents-v1"

/**
 |
 | The root declares three regions rather than two, and the extra one is the
 | back link.
 |
 | The sidebar's order is fixed — back link, then the content type's
 | contributions, then components' — and its heading depth is not flat: the
 | page's title is the document's first heading, and everything the side region
 | holds sits under it. A single flat list cannot express that, because a block
 | cannot open a heading level around its own siblings.
 |
 */
export type Root = Block & {
	__component: typeof ROOT
	page_layout: Page_Layout
	title: string
	standfirst: string | null
	/**
	 |
	 | The chrome, and the colours it sits inside.
	 |
	 | The root owns the page's outermost element, which is the only place the
	 | context colours can go: two pages in one site belong to different
	 | editions, so a declaration any higher would be site-wide.
	 |
	 | The chrome reads the **main event** and the colours read the **resolved**
	 | one, and on a page belonging to an older or a newer edition those are
	 | two different events. That disagreement is deliberate and recorded.
	 |
	 */
	colours: Record<string, string>
	main_event: Event | null
	page_shell: Page_Shell | null
	/** Exactly one block, or none on a one-column page. */
	back_link: Block[]
	/** The content type's contributions, then components'. */
	sidebar: Block[]
	main: Block[]
}

export type Assembled = {
	root: Root
	table_of_contents: Table_Of_Contents
}

export function assemble_root ( envelope: Envelope ): Assembled {
	const { entry, main_event, page_shell, resolved_event } = envelope
	const main = entry.main_region ?? []

	// A one-column page renders none of the sidebar: no back link, no table of
	// contents, no side region. It is not a narrower sidebar, it is no sidebar.
	const has_sidebar = entry.page_layout !== ONE_COLUMN

	const table_of_contents = has_sidebar && entry.toc
		? collect_table_of_contents( main )
		: EMPTY_TABLE_OF_CONTENTS

	return {
		root: {
			__component: ROOT,
			back_link: has_sidebar
				? [ { __component: BACK_LINK, ...back_link_for() } ]
				: [],
			colours: context_colours( resolved_event ),
			main,
			main_event,
			page_layout: entry.page_layout,
			page_shell,
			sidebar: has_sidebar
				? build_sidebar( entry, table_of_contents )
				: [],
			standfirst: entry.standfirst,
			title: entry.title,
		},
		table_of_contents,
	}
}

/**
 |
 | Everything below the back link and the title.
 |
 | The content type always precedes the component: a Page contributes its table
 | of contents, when it asked for one and something opted in, and then its side
 | region.
 |
 */
function build_sidebar ( entry: Entry, toc: Table_Of_Contents ): Block[] {
	return [
		...( toc.entries.length > 0
			? [ { __component: TABLE_OF_CONTENTS, entries: toc.entries } ]
			: [] ),
		...( entry.side_region ?? [] ),
		// Component contributions — a listing's filtration widget — portal
		// themselves in below all of this. Nothing in the catalogue does yet.
	]
}

/**
 |
 | One back link, at the top of the sidebar, shaped as a button. What it says
 | follows from the content type: "Back to Home" on a Page, the session's own
 | category on a Session, "Back to Collaborators" on a Contributor.
 |
 */
function back_link_for () {
	return { label: "Back to Home", url: "/" }
}
