
/**
 |
 | Listings, resolved server-side and spliced into the component's own node.
 |
 | Five components hold a listing. One is curated — an editor drags sessions
 | into the order they should read in. One holds a category and a count and
 | fills itself from the event the page resolved to. One does either, depending
 | on whether its relation was left empty. Two hold no count at all and answer
 | with everything, because they filter in the browser.
 |
 | All five leave here holding **rows**, under the same attribute name, each
 | carrying its own URL, and a block that renders a listing therefore has one
 | code path rather than two and cannot tell — and must not care — how the rows
 | were chosen.
 |
 | Two things do differ between them, and both are deliberate. The two
 | filtration listings are **not capped**, because a page that filters a set
 | client-side has to hold the set. And the schedule's rows carry the hours,
 | because the schedule is the one listing read hour by hour.
 |
 | # Why this is not a populate branch
 |
 | "The next six Showcases belonging to this page's event, soonest first" is a
 | query with a filter, a sort and a limit. A populate object can express none
 | of those against a relation that is not there, so the query has to be made
 | somewhere, and it is made here.
 |
 | The curated case could have been a populate branch, and deliberately is not.
 | See `src/this/components/list/curated-rows.ts`.
 |
 | # Why the rows are fetched after the entry has been sanitised
 |
 | A card needs the URL of the thing it links to, and a URL lives in webtools'
 | alias table rather than on the row. `url_alias` is a relation to a plugin
 | content type nobody holds a `find` permission for, so the content API's
 | sanitiser drops it from anything it passes over — which is correct, and which
 | is why the alias is read here **before** each row is sanitised and the path
 | attached to the sanitised row afterwards, as a plain string. Exactly what the
 | envelope route does with `contentType`.
 |
 | # What this costs
 |
 | One query per listing, plus that query's own populate branches. Row count is
 | bounded at ten by the schema and again here, so the cap holds even for a
 | curated list an editor over-filled: the eleventh session is never fetched
 | rather than being fetched and then not drawn. The two filtration listings
 | are the stated exception and are bounded only by how much programme an
 | event has.
 |
 | **Every field is narrowed.** A listing card wants a name, a category, a
 | price, an age group, two dates, a line of standfirst, a cover and the names
 | of the people in it. Left unnarrowed each row would carry its whole region
 | tree, which is the single largest payload win available to this build.
 |
 */

import type { UID } from "@strapi/strapi"

import { populate_image_v1 } from "../components/media/image-v1"
import { populate_responsive_image_v1 } from "../components/media/responsive-image-v1"

const SESSION_UID = "api::session.session"
const CONTRIBUTOR_UID = "api::contributor.contributor"

/**
 |
 | The upper bound the spec sets on every listing.
 |
 | Relations support `required` but not `max`, so a curated list can hold
 | eleven. The field description says ten and this is what makes it true.
 |
 */
const MAXIMUM_ROWS = 10

/**
 |
 | What the two filtration listings ask for instead: the lot.
 |
 | The document service pages by default, so "all of them" has to be said rather
 | than left out — an omitted limit is a limit of whatever `config/api.ts` sets
 | as its default, which is a cap nobody chose and nobody would see until the
 | twenty-sixth session went missing from a page of Showcases.
 |
 | It is a number rather than `-1` so that a runaway is bounded by something. It
 | is deliberately far above any real programme: a festival with five hundred
 | sessions in one category is a content problem long before it is a payload
 | one, and a page that hit this ceiling would be wrong in a way no filter could
 | hide.
 |
 */
const WHOLE_PROGRAMME = 500

/**
 |
 | What a session card is built from, and nothing else.
 |
 | `standfirst` is here because the featured workshop card shows a line of it;
 | the contributors are here because a card reads "by" somebody. Neither the
 | region nor the instances nor the venue are, because no card draws them.
 |
 */
const SESSION_ROW = {
	fields: [
		"name",
		"standfirst",
		"category",
		"age_group",
		"price",
		"session_date_first",
		"session_date_last",
	],
	populate: {
		contributors: { fields: [ "name" ] },
		cover: { populate: populate_responsive_image_v1 },
		url_alias: { fields: [ "url_path" ] },
	},
}

/**
 |
 | What a schedule entry is built from — a card's row, plus the hours.
 |
 | A card shows days and never hours, which is why `instances` and
 | `all_day_event` are out of the row above. The schedule is read hour by hour:
 | it lists one entry per **instance**, so a session running on three days
 | appears three times, and the flag that replaces the hours with "All day"
 | has to travel with them or a session that carries it would be drawn with
 | times it does not keep.
 |
 | Everything else stays narrowed. Forty sessions with their region trees
 | attached is the largest payload this build could ship by accident, and the
 | schedule is the page that would ship it.
 |
 */
const SCHEDULE_ROW = {
	fields: [ ...SESSION_ROW.fields, "all_day_event" ],
	populate: {
		...SESSION_ROW.populate,
		instances: { fields: [ "time_start", "time_end" ] },
	},
}

const CONTRIBUTOR_ROW = {
	fields: [ "name", "role" ],
	populate: {
		image: { populate: populate_image_v1 },
		url_alias: { fields: [ "url_path" ] },
	},
}

/**
 |
 | Soonest first, and alphabetical within a day, so the order is total.
 |
 | Both databases sort nulls first on an ascending order, which would put a
 | session with no first date at the head of the row. No such session can exist:
 | `instances` is required with a minimum of one, and a middleware derives both
 | dates from them on every write. A filter excluding nulls would hide such a
 | session outright, which is worse than showing it first.
 |
 */
const SESSION_ORDER = [ "session_date_first:asc", "name:asc" ]

const CONTRIBUTOR_ORDER = [ "name:asc" ]

export type Listing_Context = {
	auth: unknown
	/**
	 |
	 | The event a listing is filtered to: the entry's own, failing that the
	 | main one. **Null filters nothing** — with no event marked main and none
	 | of its own, a page shows what there is rather than showing nothing,
	 | which is how the rest of event resolution degrades.
	 |
	 | It is the event as the database holds it rather than a sanitised
	 | copy — the envelope route sanitises its own before answering — so
	 | anything read off it here is narrowed by hand before it reaches a
	 | node. The schedule document is the one thing that is.
	 |
	 */
	resolved_event:
		| { documentId?: string; schedule?: Uploaded_File | null }
		| null
	status: "draft" | "published"
}

/**
 |
 | Fills in every listing anywhere below `entry`, in place.
 |
 | The walk is by shape rather than by path. A listing sits inside a section
 | today and could sit inside a composite tomorrow, and a walk that named
 | `main_region` would have to be edited on the day it did — silently returning
 | an empty listing until somebody noticed.
 |
 */
export async function splice_listings (
	entry: unknown,
	context: Listing_Context,
): Promise<void> {
	await Promise.all(
		listing_nodes( entry ).map( ( node ) => splice( node, context ) ),
	)
}

type Node = Record<string, any>

function listing_nodes ( value: unknown, found: Node[] = [] ): Node[] {
	if ( Array.isArray( value ) ) {
		for ( const item of value ) {
			listing_nodes( item, found )
		}

		return found
	}

	if ( !value || typeof value !== "object" ) {
		return found
	}

	const node = value as Node

	if ( Object.prototype.hasOwnProperty.call( RESOLVERS, node.__component ) ) {
		found.push( node )
	}

	for ( const attribute of Object.values( node ) ) {
		listing_nodes( attribute, found )
	}

	return found
}

async function splice ( node: Node, context: Listing_Context ) {
	await RESOLVERS[node.__component]( node, context )
}

/**
 |
 | Which listing is filled in how, keyed by the component that holds it.
 |
 | One map rather than a membership test and an `if`-cascade that had to agree
 | with it: the walk above asks the same question this dispatch answers, and two
 | places naming the same three components is one place for a fourth to be
 | forgotten. It is the shape `SECTION_LIST` and the website's block registry
 | already use.
 |
 */
const RESOLVERS: Record<
	string,
	( node: Node, context: Listing_Context ) => Promise<void>
> = {
	"list.contributor-listing-v1": async ( node, context ) => {
		// **Curated when it holds anybody, automatic when it does not.** One
		// attribute answering two ways is the whole of this component's design:
		// an editor who wants a particular five drags them in, and an editor
		// who wants "this event's people" does nothing at all.
		node.contributors = has_rows( node.contributors )
			? await curated(
				CONTRIBUTOR_UID,
				node.contributors,
				CONTRIBUTOR_ROW,
				context,
			)
			: await read(
				CONTRIBUTOR_UID,
				CONTRIBUTOR_ROW,
				{
					filters: { ...for_the_event( "events", context ) },
					limit: capped( node.count ),
					sort: CONTRIBUTOR_ORDER,
				},
				context,
			)
	},

	"list.session-list-v1": async ( node, context ) => {
		node.sessions = await curated(
			SESSION_UID,
			node.sessions,
			SESSION_ROW,
			context,
		)
	},

	"list.session-listing-v1": async ( node, context ) => {
		node.sessions = await read(
			SESSION_UID,
			SESSION_ROW,
			{
				filters: {
					category: node.category,
					...for_the_event( "event", context ),
				},
				limit: capped( node.count ),
				sort: SESSION_ORDER,
			},
			context,
		)
	},

	// **The one listing with no cap on it**, and the reason the cap is a
	// number rather than a rule: a category listing page filters client-side,
	// so a visitor narrowing by day and age group is narrowing the set already
	// in the browser. Handing them the first ten and calling it the category
	// would make every filter a lie about what it searched.
	"list.session-listing-with-filtration-v1": async ( node, context ) => {
		node.sessions = await read(
			SESSION_UID,
			SESSION_ROW,
			{
				filters: {
					category: node.category,
					...for_the_event( "event", context ),
				},
				limit: WHOLE_PROGRAMME,
				sort: SESSION_ORDER,
			},
			context,
		)
	},

	// The schedule. Unbounded for the same reason, and unfiltered by category
	// because reading across the four is the whole of what a schedule is for.
	//
	// **The schedule document is spliced on beside the rows.** It belongs to
	// the resolved event rather than to the component, and handing it to the
	// node here is what lets the block that draws the download link hold
	// everything it draws — the alternative is threading an event down through
	// the render tree to one leaf that wants one attribute of it.
	"list.session-schedule-list-v1": async ( node, context ) => {
		node.schedule = schedule_document( context )
		node.sessions = await read(
			SESSION_UID,
			SCHEDULE_ROW,
			{
				filters: { ...for_the_event( "event", context ) },
				limit: WHOLE_PROGRAMME,
				sort: SESSION_ORDER,
			},
			context,
		)
	},
}

/**
 |
 | The few attributes of an uploaded file anything outside the CMS reads.
 |
 | An upload row carries a great deal more — provider metadata, every generated
 | format, the folder it sits in — and none of it belongs in a page's payload.
 |
 */
type Uploaded_File = {
	name?: string | null
	url?: string | null
}

/**
 |
 | The resolved event's schedule document: where the file is, and what to call
 | it once it has been downloaded.
 |
 | Narrowed rather than passed through because the event this reads is the
 | **unsanitised** one — the envelope route sanitises its own copy separately.
 | Both attributes have a reader: the url is the link's target, and the name is
 | what the `download` attribute saves the file as, which is otherwise the
 | hashed name the upload provider gave it.
 |
 */
function schedule_document (
	{ resolved_event }: Listing_Context,
): Uploaded_File | null {
	const schedule = resolved_event?.schedule

	if ( !schedule?.url ) {
		return null
	}

	return { name: schedule.name ?? null, url: schedule.url }
}

function has_rows ( relation: unknown ): boolean {
	return Array.isArray( relation ) && relation.length > 0
}

/**
 |
 | Ten at most, whatever the component says.
 |
 | A count outside the schema's range cannot reach here through the admin, and
 | a listing seeded or imported by hand can carry anything at all.
 |
 */
function capped ( count: unknown ): number {
	const wanted = typeof count === "number" && count > 0
		? count
		: MAXIMUM_ROWS

	return Math.min( wanted, MAXIMUM_ROWS )
}

function for_the_event (
	attribute: string,
	{ resolved_event }: Listing_Context,
): Record<string, unknown> {
	const documentId = resolved_event?.documentId

	return documentId ? { [attribute]: { documentId } } : {}
}

/**
 |
 | The rows an editor dragged in, in the order they dragged them.
 |
 | The relation arrives as identities alone, so the rows are fetched here — and
 | the fetch is a filter rather than an ordered read, because `$in` says nothing
 | about order. The editor's order is restored from the identities afterwards.
 |
 */
async function curated (
	uid: string,
	relation: unknown,
	row: object,
	context: Listing_Context,
) {
	const wanted = ( Array.isArray( relation ) ? relation : [] )
		.map( ( entry ) => entry?.documentId )
		.filter( ( documentId ): documentId is string =>
			typeof documentId === "string"
		)
		.slice( 0, MAXIMUM_ROWS )

	if ( wanted.length === 0 ) {
		return []
	}

	const rows = await read( uid, row, {
		filters: { documentId: { $in: wanted } },
		limit: wanted.length,
	}, context )

	return rows
		.slice()
		.sort( ( one, other ) =>
			wanted.indexOf( one.documentId as string )
			- wanted.indexOf( other.documentId as string )
		)
}

/**
 |
 | One query, narrowed, sanitised row by row, each row carrying its own path.
 |
 */
async function read (
	uid: string,
	row: object,
	query: object,
	context: Listing_Context,
): Promise<Record<string, unknown>[]> {
	const rows = await strapi.documents( uid as UID.ContentType ).findMany( {
		...row,
		...query,
		...draft_or_published( uid, context ),
	} as any ) as Record<string, any>[]

	return await Promise.all( rows.map( async ( entry ) => {
		const { url_alias, ...without_the_alias } = entry

		return {
			...await sanitise( without_the_alias, uid, context.auth ),
			path: path_of( url_alias ),
		}
	} ) )
}

/**
 |
 | `status` reaches the document service only for a content type that has draft
 | and publish. Contributor does not — decision record 00002 — and a status on a
 | type with no draft to ask for is a parameter with no meaning.
 |
 */
function draft_or_published ( uid: string, context: Listing_Context ) {
	const content_type = strapi.contentTypes[uid as UID.ContentType] as any

	return content_type?.options?.draftAndPublish
		? { status: context.status }
		: {}
}

/**
 |
 | The row's own URL, from webtools' alias table.
 |
 | A `oneToMany`, so it arrives as a list; a document has one alias per locale
 | and this site has one locale, so the first one that carries a path is it. An
 | entry with no alias at all answers null and the card renders as text rather
 | than as a link to nowhere.
 |
 */
function path_of ( url_alias: unknown ): string | null {
	const aliases = Array.isArray( url_alias ) ? url_alias : [ url_alias ]

	for ( const alias of aliases ) {
		const path = ( alias as { url_path?: unknown } )?.url_path

		if ( typeof path === "string" && path !== "" ) {
			return path
		}
	}

	return null
}

async function sanitise (
	data: unknown,
	uid: string,
	auth: unknown,
): Promise<Record<string, unknown>> {
	return await strapi.contentAPI.sanitize.output(
		data as any,
		strapi.contentTypes[uid as UID.ContentType],
		{ auth } as any,
	) as Record<string, unknown>
}
