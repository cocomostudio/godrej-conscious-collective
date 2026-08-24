
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
	Envelope,
	Event,
	Page_Entry,
	Page_Layout,
	Page_Shell,
	Session_Entry,
} from "./envelope.ts"
import type { Role } from "./context-colours.ts"
import type { Table_Of_Contents } from "./table-of-contents.ts"

import { context_colours } from "./context-colours.ts"
import { is_session } from "./envelope.ts"
import {
	back_link_to_category,
	role_of,
	session_details,
} from "./sessions.ts"
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

export const TWO_COLUMN: Page_Layout = "two-column"

export const ROOT = "this.root-v1"
export const BACK_LINK = "this.back-link-v1"
export const TABLE_OF_CONTENTS = "this.table-of-contents-v1"

/**
 |
 | The blocks a session's page has that no component produces.
 |
 | Every component maps to exactly one block, and some blocks map to no
 | component at all because they are built from an entry's top-level attributes.
 | These are three of those, and they are the reason a session needs more of the
 | website than a Page does.
 |
 */
export const MASTHEAD = "this.masthead-v1"
export const SESSION_DETAILS = "this.session-details-v1"
export const ADD_TO_CALENDAR = "this.add-to-calendar-v1"

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
	/**
	 |
	 | The page's name, shown at the top of the sidebar — **or null when a
	 | masthead carries it instead.**
	 |
	 | A page's name has to appear exactly once, as the document's `h1`. A Page
	 | shows it in the sidebar; a session shows it in the masthead, where the
	 | design puts it against the cover. Two of them would be two `h1`s saying
	 | the same thing.
	 |
	 */
	title: string | null
	standfirst: string | null
	/**
	 |
	 | The chrome, and the colours it sits inside.
	 |
	 | The root owns the page's outermost element, which is the only place the
	 | context colours can go: two pages in one site belong to different
	 | events, so a declaration any higher would be site-wide.
	 |
	 | The chrome reads the **main event** and the colours read the **resolved**
	 | one, and on a page belonging to an older or a newer event those are
	 | two different events. That disagreement is deliberate and recorded.
	 |
	 */
	colours: Record<string, string>
	main_event: Event | null
	page_shell: Page_Shell | null
	/** Exactly one block, or none on a one-column page. */
	back_link: Block[]
	/**
	 |
	 | At the head of the main column, full-bleed within it, and above the
	 | heading level everything else nests under. Empty on a Page.
	 |
	 */
	masthead: Block[]
	/** The content type's contributions, then components'. */
	sidebar: Block[]
	/** Whether the sidebar column exists below the medium breakpoint. */
	sidebar_at_every_width: boolean
	/**
	 |
	 | The sidebar again, in the main column, for the widths at which the
	 | sidebar itself is not there. Empty wherever it is.
	 |
	 */
	sidebar_repeat: Block[]
	main: Block[]
}

export type Assembled = {
	root: Root
	table_of_contents: Table_Of_Contents
}

export function assemble_root ( envelope: Envelope ): Assembled {
	const { entry, main_event, page_shell, resolved_event } = envelope
	const contribution = is_session( entry )
		? of_a_session( entry )
		: of_a_page( entry )

	// A one-column page renders none of the sidebar: no back link, no table of
	// contents, no side region. It is not a narrower sidebar, it is no sidebar.
	//
	// The layout comes from the contribution rather than from the entry because
	// it is not always an editor's choice: **a session has no `page_layout`
	// attribute at all**, and is two-column by construction.
	const has_sidebar = contribution.page_layout !== ONE_COLUMN

	const table_of_contents = has_sidebar && contribution.collects_a_toc
		? collect_table_of_contents( entry.main_region ?? [] )
		: EMPTY_TABLE_OF_CONTENTS

	return {
		root: {
			__component: ROOT,
			back_link: has_sidebar
				? [ { __component: BACK_LINK, ...contribution.back_link } ]
				: [],
			colours: context_colours(
				resolved_event,
				contribution.context_role,
			),
			main: entry.main_region ?? [],
			main_event,
			masthead: contribution.masthead,
			page_layout: contribution.page_layout,
			page_shell,
			sidebar: has_sidebar
				? [
					...table_of_contents_for( table_of_contents ),
					...contribution.sidebar,
					// Component contributions — a listing's filtration widget
					// — portal themselves in below all of this. Nothing in the
					// catalogue does yet.
				]
				: [],
			sidebar_at_every_width: contribution.sidebar_at_every_width,
			sidebar_repeat: has_sidebar ? contribution.sidebar_repeat : [],
			standfirst: contribution.standfirst,
			title: contribution.title,
		},
		table_of_contents,
	}
}

/**
 |
 | What one content type contributes to the root, and the whole of what
 | distinguishes it from another.
 |
 | Everything else about assembly — the columns, the one-column rule, the order
 | of the sidebar — is the same whichever type answered, so it is written once
 | above and each type fills in the slots below.
 |
 */
type Content_Type_Contribution = {
	/**
	 |
	 | One column or two.
	 |
	 | A Page's is the editor's choice. A session's is not a choice at all — the
	 | content type carries no such attribute, because a session page has a
	 | sidebar the design depends on and one column would leave a visitor with
	 | no times, no price, no venue and no way back.
	 |
	 */
	page_layout: Page_Layout
	/** The sidebar's heading, or null when a masthead carries the name. */
	title: string | null
	/**
	 |
	 | The line beneath the name, wherever the name went. Null on a content type
	 | whose masthead carries both, so that neither is said twice.
	 |
	 */
	standfirst: string | null
	back_link: { label: string; url: string }
	masthead: Block[]
	/** The content type's own sidebar contributions, before any component's. */
	sidebar: Block[]
	/**
	 |
	 | Whether that sidebar is shown below the medium breakpoint, and what the
	 | main column carries there when it is not.
	 |
	 | A Page shows its sidebar at every width, so it repeats nothing. A session
	 | hides it and the main column carries the same blocks again beneath the
	 | masthead — which is what the design does, and which means the same
	 | content appears twice in the markup on purpose.
	 |
	 */
	sidebar_at_every_width: boolean
	sidebar_repeat: Block[]
	context_role: Role
	/**
	 |
	 | **A table of contents renders only on a Page**, and only when it asked
	 | for one. A content type with no `toc` attribute has nothing for a
	 | section's opt-in to answer to.
	 |
	 */
	collects_a_toc: boolean
}

function of_a_page ( entry: Page_Entry ): Content_Type_Contribution {
	return {
		back_link: { label: "Back to Home", url: "/" },
		collects_a_toc: entry.toc,
		context_role: "theme",
		masthead: [],
		page_layout: entry.page_layout,
		sidebar: entry.side_region ?? [],
		sidebar_at_every_width: true,
		sidebar_repeat: [],
		standfirst: entry.standfirst,
		title: entry.title,
	}
}

/**
 |
 | A session's page.
 |
 | **The masthead is implicit on every one of them** — built from the session's
 | own `name`, `standfirst` and `cover` rather than from a component, because
 | there is no version of a session page that does not have one and an editor
 | choosing to leave it out is not a choice worth offering.
 |
 | The sidebar carries the facts a visitor decides on, and then the Add to
 | Calendar stub below them. The back link goes to the session's own category
 | rather than to the home page, because the category listing is where a visitor
 | came from.
 |
 */
function of_a_session ( entry: Session_Entry ): Content_Type_Contribution {
	const back_link = back_link_to_category( entry )
	const details = session_details( entry )

	return {
		back_link,
		collects_a_toc: false,
		context_role: role_of( entry ),
		masthead: [ {
			__component: MASTHEAD,
			// The masthead's own copy of the back link, shown only below the
			// medium breakpoint, where the sidebar's copy is not there.
			back_link,
			cover: entry.cover,
			standfirst: entry.standfirst,
			title: entry.name,
		} ],
		page_layout: TWO_COLUMN,
		sidebar: [
			{ __component: SESSION_DETAILS, details },
			{ __component: ADD_TO_CALENDAR },
		],
		sidebar_at_every_width: false,
		// The same two blocks again, for the main column on a phone. The
		// details lay out across two columns there, which is the whole reason
		// this is a second block rather than the first one moved.
		sidebar_repeat: [
			{ __component: SESSION_DETAILS, columns: 2, details },
			{ __component: ADD_TO_CALENDAR },
		],
		// Both are in the masthead, and a name or a line said twice is worse
		// than a sidebar that is quieter than a Page's.
		standfirst: null,
		title: null,
	}
}

/**
 |
 | The table of contents, when there is one to show.
 |
 | It comes first in the sidebar because **the content type always precedes the
 | component**, and within the content type's own contributions it is what the
 | reader navigates with.
 |
 */
function table_of_contents_for ( toc: Table_Of_Contents ): Block[] {
	return toc.entries.length > 0
		? [ { __component: TABLE_OF_CONTENTS, entries: toc.entries } ]
		: []
}
