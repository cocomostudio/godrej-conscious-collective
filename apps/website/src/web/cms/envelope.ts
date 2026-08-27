
/**
 |
 | What the CMS hands over for a page.
 |
 | One request, one envelope, one cache key. The entry arrives populated to the
 | bottom of the render tree and **ready to walk** — the website assembles the
 | root and nothing else.
 |
 */

import type { Calendar_Link } from "./calendar-links.ts"
import type {
	Image_Attribute,
	Responsive_Image_Attribute,
} from "./media.ts"

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
	/**
	 |
	 | Null on every link written before the attribute existed — a schema
	 | default is applied when a row is saved, not when one is read. The website
	 | reads that as the colour the link has always drawn itself in. See
	 | `blocks/text-color.ts`.
	 |
	 */
	text_color?: "context" | "theme" | "black" | "white" | null
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
 | One run of the programme.
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

/**
 |
 | What every entry carries, whichever content type answered.
 |
 | `contentType` is the discriminator, and it is the CMS's uid rather than a
 | word of the website's own — the envelope route already knows which type it
 | resolved and inventing a second name for it here would be two vocabularies
 | for one fact.
 |
 */
type Entry_Common = {
	documentId: string
	standfirst: string | null
	main_region: Block[]
	[attribute: string]: unknown
}

export const PAGE = "api::page.page"
export const SESSION = "api::session.session"
export const CONTRIBUTOR = "api::contributor.contributor"

export type Page_Entry = Entry_Common & {
	contentType: typeof PAGE
	title: string
	/**
	 |
	 | One column or two — **a Page's choice alone.** A session carries no such
	 | attribute, because there is no session page that works in one column and
	 | an option that cannot be right is not worth offering.
	 |
	 */
	page_layout: Page_Layout
	/**
	 |
	 | What the page's context colour is pointed at — any of the event's six
	 | colours, or plain black or plain white.
	 |
	 | Null on every page saved before the attribute existed, for the reason
	 | `text_color` above is: a schema default is written when a row is saved,
	 | not read when one is. The website reads that as the theme, which is what
	 | every page drew as before there was anything to choose.
	 |
	 */
	color_scheme?:
		| "theme"
		| "showcase"
		| "experience"
		| "conversation"
		| "workshop"
		| "contributor"
		| "black"
		| "white"
		| null
	toc: boolean
	side_region: Block[]
}

/**
 |
 | One programme item. The public reads it as an "Event".
 |
 | Everything below `name` is what the sidebar's details list is built from,
 | and none of it comes from a component — which is why a session's page needs
 | more of the website than a Page's does.
 |
 */
export type Session_Entry = Entry_Common & {
	contentType: typeof SESSION
	name: string
	cover: Responsive_Image_Attribute | null
	category: Category
	instances: Session_Instance[]
	/** Derived by the CMS from the instances. Read-only, and never edited. */
	session_date_first: string | null
	session_date_last: string | null
	all_day_event: boolean
	/** No currency: the event runs in one city. Zero means free. */
	price: number | null
	venue: Link | null
	age_group: Age_Group
	checkout_url: string | null
}

/**
 |
 | A person taking part in a session — a "Collaborator" everywhere a visitor or
 | editor reads it.
 |
 | It carries no region and no `page_layout`. Its page is two-column by
 | construction, and its main column is a single ContributorProfile block that
 | root assembly builds from `name`, `role`, `image` and `blurb` — the same
 | pattern the Masthead uses. The `events` relation is derived and hidden, so
 | it never travels in the envelope.
 |
 */
export type Contributor_Entry = Entry_Common & {
	contentType: typeof CONTRIBUTOR
	name: string
	role: string | null
	/**
	 |
	 | The contributor's picture. Named `image` because the underlying component
	 | is `media.image-v1` and every other schema that carries one uses that
	 | word too; the editor sees it labelled "Portrait", which is what the
	 | picture *is* rather than what type of thing it is.
	 |
	 */
	image: Image_Attribute | null
	/** Strapi `blocks` content — the same shape the WYSIWYG component holds. */
	blurb: unknown
}

export type Entry = Page_Entry | Session_Entry | Contributor_Entry

/* _____
 | What a listing hands a card.
 |
 | **A block cannot tell a curated listing from an automatic one**, and that is
 | the whole design. The CMS resolves both — an ordered relation an editor
 | dragged into shape, or a category and a count filled in from the page's
 | event — and splices the same narrowed rows into the component's node either
 | way, so a listing block has one code path.
 |
 | Narrow is the point. These are the columns a card draws and nothing else: a
 | row here is not an entry, and asking it for a region would be asking for
 | something no listing fetches.
 |
 */

export type Session_Card = {
	documentId: string
	/**
	 |
	 | Where the card links to, from webtools' alias table rather than derived
	 | from the name — an editor can override any generated URL, and a rule
	 | here would go stale the moment one did.
	 |
	 | Null where a session has no alias at all, and the card renders as
	 | unlinked text rather than as a link to nowhere.
	 |
	 */
	path: string | null
	name: string
	standfirst: string | null
	category: Category
	age_group: Age_Group
	price: number | null
	/**
	 |
	 | A card dates itself from these two and shows no times at all, which is
	 | why a listing row carries no `all_day_event` and no instances: an hour a
	 | card never draws is an hour it should not be fetching.
	 |
	 */
	session_date_first: string | null
	session_date_last: string | null
	cover: Responsive_Image_Attribute | null
	/** Names alone — a card reads "by" somebody and draws nothing else. */
	contributors: { name: string }[]
}

/**
 |
 | What the schedule draws — a card's row, and the hours.
 |
 | The schedule is the one listing read hour by hour: it lists one entry per
 | **instance**, so a session running on three days appears three times with a
 | different time against each. A card shows days and never hours, which is why
 | neither of these is on the row above.
 |
 | `all_day_event` comes with them because a session that carries it keeps its
 | stored hours — a calendar entry still needs them — and the schedule has to
 | know to write "All day" instead of drawing them.
 |
 */
export type Session_Schedule_Row = Session_Card & {
	all_day_event: boolean
	instances: Session_Instance[]
	/**
	 |
	 | **Not from the CMS.** One signed Add to Calendar address per instance,
	 | positional, written onto the row while the page was rendered — the secret
	 | that signs them may not reach the browser, so a row cannot build its own.
	 | Null where an instance has no start to build one from. See
	 | `calendar-signing.server.ts`.
	 |
	 */
	calendar_links?: (Calendar_Link | null)[]
}

export type Contributor_Card = {
	documentId: string
	path: string | null
	name: string
	role: string | null
	image: Image_Attribute | null
}

/**
 |
 | One time a session runs. **Both ends are datetimes**, even when the session
 | is an all-day one: the website hides the times in that case and the stored
 | shape does not change, which is what the Add to Calendar output reads.
 |
 */
export type Session_Instance = {
	time_start: string | null
	time_end: string | null
	[attribute: string]: unknown
}

export const CATEGORIES = [
	"Showcase",
	"Experience",
	"Conversation",
	"Workshop",
] as const

export type Category = typeof CATEGORIES[number]

export const AGE_GROUPS = [ "All", "Children", "Adults" ] as const

export type Age_Group = typeof AGE_GROUPS[number]

export const PAGE_LAYOUTS = [ "one-column", "two-column" ] as const

export type Page_Layout = typeof PAGE_LAYOUTS[number]

export function is_session ( entry: Entry ): entry is Session_Entry {
	return entry.contentType === SESSION
}

export function is_contributor ( entry: Entry ): entry is Contributor_Entry {
	return entry.contentType === CONTRIBUTOR
}

/**
 |
 | What the entry is called.
 |
 | A Page holds it in `title` and a session in `name`, because each attribute is
 | named for what an editor is naming — a page, or a programme item — and the
 | URL pattern interpolates the one its own content type carries. Everything
 | that wants the words rather than the attribute asks here.
 |
 */
export function name_of ( entry: Entry ): string {
	if ( is_session( entry ) ) {
		return entry.name
	}

	if ( is_contributor( entry ) ) {
		return entry.name
	}

	return entry.title
}

export type Envelope = {
	entry: Entry
	page_shell: Page_Shell | null
	/**
	 |
	 | The site chrome follows the **main event**, on every page, always,
	 | including archived ones — so a visitor arriving on an old page through an
	 | old link still has a route to the event that is actually running.
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
