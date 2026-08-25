
/**
 |
 | A contributor's `events` follows from the published sessions they are in.
 |
 | Contributor.events is hidden and never edited. It is what the contributors
 | listing filters by, so pulling one edition's people is one join across
 | `contributors_events_lnk` rather than reaching through sessions for every
 | row. The two ways would answer the same question, so only the derived answer
 | is stored — and only for **published** sessions, so a contributor whose
 | work is all still in draft belongs to no edition and appears in no listing.
 |
 | # Why the middleware reads the stored contributor list twice
 |
 | The write is the point of change and it can go three ways: a session that
 | adds a contributor, one that drops a contributor, and one that is deleted
 | outright. Every one of those needs a contributor whose derivation may now be
 | wrong to be recomputed, and the union of "who was on the row before" and
 | "who is on the row after" is exactly that set — including a removal, which
 | is a contributor in the before set and not in the after.
 |
 | The list is read from the **stored** row rather than from `context.params`,
 | which is verbatim caller input: a many-to-many attribute in caller input can
 | arrive as at least six shapes, and distinguishing them by hand is the same
 | job Strapi's own relation code does. Reading the stored row asks the
 | database what is true, and the answer has one shape.
 |
 | # And why it recomputes rather than patches
 |
 | For every contributor in the union, the middleware throws out whatever was
 | there and derives the events again from the published sessions that still
 | link to them. The alternative — adding the new event and taking the old one
 | away — needs to know which event a removed session pointed at, and the
 | delete case has no session left to ask. Recomputing works for every action
 | with the same code path, and there is no branch that "removal" needs.
 |
 | # Reads and writes go through `strapi.db.query`
 |
 | A document-service call from inside a middleware re-enters the whole
 | middleware chain from index zero — there is no recursion guard in
 | `@strapi/core` 5.52.1 — so this middleware writing a contributor through the
 | document service would re-enter itself. The query engine sits below the
 | middleware chain and is what every other reconciling middleware in this
 | directory reaches for.
 |
 */

import type { Core } from "@strapi/strapi"

const SESSION_UID = "api::session.session"
const CONTRIBUTOR_UID = "api::contributor.contributor"

const ACTIONS = new Set( [
	"create",
	"update",
	"delete",
	"publish",
	"unpublish",
] )

export function derive_contributor_events ( strapi: Core.Strapi ) {
	return async function reconcile_after ( context, next ) {
		if ( context.uid !== SESSION_UID || !ACTIONS.has( context.action ) ) {
			return await next()
		}

		const document_id = context.params?.documentId as string | undefined

		const before = await published_contributors_of_session(
			strapi,
			document_id,
		)

		const result = await next()

		const after_document_id = document_id
			?? ( result as { documentId?: string } )?.documentId

		const after = await published_contributors_of_session(
			strapi,
			after_document_id,
		)

		const affected = new Set<string>( [ ...before, ...after ] )

		for ( const contributor_document_id of affected ) {
			await recompute_events_of_contributor(
				strapi,
				contributor_document_id,
			)
		}

		return result
	}
}

/**
 |
 | The contributor document ids on the given session's **published** row, or
 | nothing when the session has no published row (a fresh create, or one that
 | has been deleted). A draft-only session contributes to nobody's events, so
 | it looks the same as an absent one.
 |
 */
async function published_contributors_of_session (
	strapi: Core.Strapi,
	document_id: string | undefined,
): Promise<string[]> {
	if ( !document_id ) {
		return []
	}

	const row = await strapi.db.query( SESSION_UID ).findOne( {
		select: [ "id" ],
		where: {
			documentId: document_id,
			publishedAt: { $notNull: true },
		},
		populate: {
			contributors: { select: [ "documentId" ] },
		},
	} ) as { contributors?: { documentId: string }[] } | null

	if ( !row?.contributors ) {
		return []
	}

	return row.contributors.map( ( contributor ) => contributor.documentId )
}

/**
 |
 | Rebuilds `Contributor.events` from every published session that still
 | points at this contributor. The relation is set wholesale, so a contributor
 | who is no longer in any published session ends up with none — which is the
 | archival rule this content type asks for, without a stored flag.
 |
 */
async function recompute_events_of_contributor (
	strapi: Core.Strapi,
	contributor_document_id: string,
) {
	const contributor = await strapi.db.query( CONTRIBUTOR_UID ).findOne( {
		select: [ "id" ],
		where: { documentId: contributor_document_id },
	} ) as { id: number } | null

	if ( !contributor ) {
		// The contributor was itself deleted. Its join rows go with it.
		return
	}

	const sessions = await strapi.db.query( SESSION_UID ).findMany( {
		select: [ "id" ],
		where: {
			publishedAt: { $notNull: true },
			contributors: { documentId: contributor_document_id },
		},
		populate: { event: { select: [ "id" ] } },
	} ) as { event: { id: number } | null }[]

	const event_ids = [
		...new Set(
			sessions
				.map( ( session ) => session.event?.id )
				.filter( ( id ): id is number => typeof id === "number" ),
		),
	]

	await strapi.db.query( CONTRIBUTOR_UID ).update( {
		where: { id: contributor.id },
		data: { events: event_ids },
	} )
}
