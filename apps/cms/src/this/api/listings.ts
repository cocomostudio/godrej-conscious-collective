
/**
 |
 | Listings, resolved server-side and spliced into the component's own node.
 |
 | Three components hold a listing. One is curated — an editor drags sessions
 | into the order they should read in. One holds a category and a count and
 | fills itself from the event the page resolved to. One does either, depending
 | on whether its relation was left empty.
 |
 | All three leave here holding **rows**, under the same attribute name, in the
 | same narrowed shape, capped in the same place, each carrying its own URL. A
 | block that renders a listing therefore has one code path rather than two, and
 | cannot tell — and must not care — how the rows were chosen.
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
 | rather than being fetched and then not drawn.
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
	 */
	resolved_event: { documentId?: string } | null
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
