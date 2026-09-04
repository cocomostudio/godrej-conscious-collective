
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
	Contributor_Entry,
	Envelope,
	Event,
	Page_Entry,
	Page_Layout,
	Page_Shell,
	Session_Entry,
} from "./envelope.ts"
import type { Color_Scheme } from "./context-colours.ts"
import type { Table_Of_Contents } from "./table-of-contents.ts"

import {
	color_scheme_of,
	context_colours,
	DEFAULT_SCHEME,
} from "./context-colours.ts"
import {
	is_contributor,
	is_session,
} from "./envelope.ts"
import {
	back_link_to_category,
	calendar_instances_of_session,
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
export const CONTRIBUTOR_PROFILE = "this.contributor-profile-v1"

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
	 | A page's name has to appear exactly once as the document's `h1`, and the
	 | sidebar is where that `h1` lives on every content type that has one. A
	 | Page shows it there at every width. A session shows it in the masthead
	 | against the cover and leaves this null. A contributor shows it here below
	 | the medium breakpoint and under the portrait above it — see
	 | `title_at_every_width`.
	 |
	 */
	title: string | null
	standfirst: string | null
	/**
	 |
	 | **Whether that name and the line beneath it are drawn above the medium
	 | breakpoint.**
	 |
	 | A Page's are: the sidebar is the one place its name appears. A
	 | contributor's are not — above that width the design puts the name and the
	 | role under the portrait, centred, and the sidebar carries the back link
	 | alone.
	 |
	 | Where it is false the heading does not leave the document, it stops being
	 | painted. It is still the page's only `h1`, and `display: none` would take
	 | it out of the accessibility tree along with the pixels.
	 |
	 */
	title_at_every_width: boolean
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

/**
 |
 | `path` is the address this page was resolved at, and only a session reads
 | it: its Add to Calendar links point back at the session, and an entry
 | carries no path of its own — the alias table is what knows, and the route is
 | what asked it.
 |
 */
export function assemble_root (
	envelope: Envelope,
	{ path }: { path: string },
): Assembled {
	const { entry, main_event, page_shell, resolved_event } = envelope
	const contribution = is_session( entry )
		? of_a_session( entry, path )
		: is_contributor( entry )
		? of_a_contributor( entry )
		: of_a_page( entry )

	// A one-column page renders none of the sidebar: no back link, no table of
	// contents, no side region. It is not a narrower sidebar, it is no sidebar.
	//
	// The layout comes from the contribution rather than from the entry because
	// it is not always an editor's choice: **a session has no `page_layout`
	// attribute at all**, and is two-column by construction.
	const has_sidebar = contribution.page_layout !== ONE_COLUMN

	// Only content types with a region collect a table of contents from it. A
	// contributor's page has no region for a section to opt into, so its
	// `main` blocks below come from the contribution rather than from the
	// entry.
	const table_of_contents = has_sidebar && contribution.collects_a_toc
		? collect_table_of_contents( entry.main_region ?? [] )
		: EMPTY_TABLE_OF_CONTENTS

	return {
		root: {
			__component: ROOT,
			back_link: has_sidebar
				? [ {
					__component: BACK_LINK,
					...contribution.back_link,
					// The sidebar it sits in is grey or it is not, and the link
					// is drawn against whichever it turns out to be.
					color: contribution.sidebar_takes_the_context_colour
						? "context-above-md"
						: "context",
				} ]
				: [],
			colours: context_colours(
				resolved_event,
				contribution.color_scheme,
			),
			main: contribution.main ?? entry.main_region ?? [],
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
			sidebar_takes_the_context_colour: has_sidebar
				&& contribution.sidebar_takes_the_context_colour,
			standfirst: contribution.standfirst,
			title: contribution.title,
			title_at_every_width: contribution.title_at_every_width,
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
	/**
	 |
	 | Whether the sidebar is where that name lives at every width, or only
	 | below the medium breakpoint because the main column carries it above.
	 |
	 | **A Page's is true and a contributor's is false**, and it decides two
	 | things rather than one: whether the sidebar paints the name up there, and
	 | what the line beneath it is set in. A Page's line is a standfirst and a
	 | contributor's is a role, and the design gives them different sizes.
	 |
	 */
	title_at_every_width: boolean
	back_link: { label: string; url: string }
	masthead: Block[]
	/**
	 |
	 | The main column's blocks, when the content type builds them itself rather
	 | than reading them from the entry's region.
	 |
	 | A Page and a session both leave this undefined, and root assembly falls
	 | back to `entry.main_region ?? []`. A Contributor has no region and its
	 | main column is a single implicit ContributorProfile block, so it sets
	 | this and the fallback does not apply.
	 |
	 */
	main?: Block[]
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
	/**
	 |
	 | Whether that sidebar wears the page's context colour below the medium
	 | breakpoint, where it stacks above the content rather than sitting beside
	 | it.
	 |
	 | **A Page's, but only where an editor chose a scheme.** The colour is the
	 | editor's statement about what the page is, and a page that made no such
	 | statement falls back to the theme — which every page would then wear,
	 | turning a statement into the default.
	 |
	 | **A contributor's always.** Its colour is not a statement an editor made,
	 | but it is never absent either: every collaborator page is the contributor
	 | colour, so there is no silence here to mistake for a choice — and the
	 | name and the role are drawn white on that band.
	 |
	 | A session's never: it hides its sidebar at that width entirely.
	 |
	 */
	sidebar_takes_the_context_colour: boolean
	/**
	 |
	 | What the page's context colour is pointed at.
	 |
	 | **A Page's is an editor's choice** and may be plain black or plain white
	 | as well as any of the event's six colours. A session's and a
	 | contributor's are not choices: a session is its category and a
	 | contributor is a contributor, and either of those being answerable would
	 | let a page disagree with the card that led to it.
	 |
	 */
	color_scheme: Color_Scheme
	/**
	 |
	 | **A table of contents renders only on a Page**, and only when it asked
	 | for one. A content type with no `toc` attribute has nothing for a
	 | section's opt-in to answer to.
	 |
	 */
	collects_a_toc: boolean
}

/**
 |
 | A contributor's page.
 |
 | Two-column by construction — a contributor page in one column would have no
 | way back to the listing — and the sidebar carries the back link, the name and
 | the role. There is no side region and no table of contents.
 |
 | **The name and the role are in two places, and the width decides which one a
 | visitor sees.** Below the medium breakpoint they are in the sidebar, white on
 | a band of the contributor colour; above it they are under the portrait,
 | centred, inside the ContributorProfile. The two columns are too far apart for
 | one copy to move between them, so the words are written twice and each copy
 | is hidden at the other width — the same bargain `sidebar_repeat` strikes on a
 | session.
 |
 | **The sidebar's copy is the heading, at every width**, and above the medium
 | breakpoint it is `sr-only` rather than gone. The profile's copy is prose. One
 | `h1`, always in the accessibility tree, wherever the pixels went.
 |
 | The block owns the portrait-and-prose split. That arrangement is the whole
 | shape of the page, and the CMS holds it as four flat attributes rather than
 | as a region — one implicit block is what turns those four attributes into a
 | node the renderer can walk.
 |
 */
function of_a_contributor (
	entry: Contributor_Entry,
): Content_Type_Contribution {
	// The ContributorProfile occupies the masthead slot rather than the main
	// region — because the masthead is the one place in the main column that
	// sits **outside** the `<Level>` a section's headings nest inside, and
	// nothing it holds is a heading. It draws its own padded container to
	// match, and `main` is deliberately empty so nothing else appears beneath
	// it.
	return {
		back_link: { label: "Back to Collaborators", url: "/collaborators" },
		collects_a_toc: false,
		color_scheme: "contributor",
		main: [],
		masthead: [ {
			__component: CONTRIBUTOR_PROFILE,
			blurb: entry.blurb ?? null,
			image: entry.image,
			name: entry.name,
			role: entry.role,
		} ],
		page_layout: TWO_COLUMN,
		sidebar: [],
		sidebar_at_every_width: true,
		sidebar_repeat: [],
		sidebar_takes_the_context_colour: true,
		standfirst: entry.role,
		title: entry.name,
		title_at_every_width: false,
	}
}

function of_a_page ( entry: Page_Entry ): Content_Type_Contribution {
	const color_scheme = color_scheme_of( entry.color_scheme )

	return {
		back_link: { label: "Back to Home", url: "/" },
		collects_a_toc: entry.toc,
		color_scheme,
		masthead: [],
		page_layout: entry.page_layout,
		sidebar: entry.side_region ?? [],
		sidebar_at_every_width: true,
		sidebar_repeat: [],
		// The default is what a page that said nothing gets, and a sidebar
		// that coloured itself on that would be colouring itself on silence.
		sidebar_takes_the_context_colour: color_scheme !== DEFAULT_SCHEME,
		standfirst: entry.standfirst,
		title: entry.title,
		title_at_every_width: true,
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
function of_a_session (
	entry: Session_Entry,
	path: string,
): Content_Type_Contribution {
	const back_link = back_link_to_category( entry )
	const details = session_details( entry )
	const instances = calendar_instances_of_session( entry, path )

	return {
		back_link,
		collects_a_toc: false,
		color_scheme: role_of( entry ),
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
			{ __component: ADD_TO_CALENDAR, instances },
		],
		sidebar_at_every_width: false,
		// The same two blocks again, for the main column on a phone. The
		// details lay out across two columns there, which is the whole reason
		// this is a second block rather than the first one moved.
		sidebar_repeat: [
			{ __component: SESSION_DETAILS, columns: 2, details },
			{ __component: ADD_TO_CALENDAR, instances },
		],
		// Nothing to colour: the sidebar is not drawn at that width at all.
		sidebar_takes_the_context_colour: false,
		// Both are in the masthead, and a name or a line said twice is worse
		// than a sidebar that is quieter than a Page's.
		standfirst: null,
		title: null,
		title_at_every_width: true,
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
