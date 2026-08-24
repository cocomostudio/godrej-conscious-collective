
/**
 |
 | Resolves a path to a whole page, and answers with one envelope.
 |
 | `GET /api/envelope?path=/about&status=published`
 |
 | The envelope carries the entry, its page shell, the main event and the
 | resolved event. The website is server-rendered, so a page is one request and
 | one cache key, and the event resolution rule runs here — where the data is —
 | rather than being reimplemented in the website.
 |
 | Three things this does that webtools' own resolver does not:
 |
 |   • **Permissions are checked before the lookup.** Webtools checks after, so
 |     it answers 403 for an entry that exists and 404 for one that does not,
 |     which tells an unauthorised caller which paths are real. Here the set of
 |     content types the caller may read is settled first, and a path belonging
 |     to any other type is indistinguishable from a path belonging to nothing.
 |
 |   • **The populate object lives here**, beside the schemas it mirrors, so
 |     both change in one commit and the website cannot drift from the content
 |     model by describing it.
 |
 |   • **The response is a cacheable GET.** The populate object is far too large
 |     for a URL, which is what pushed the reference project into a POST body
 |     and made every page response uncacheable by any intermediary.
 |
 */

import type { UID } from "@strapi/strapi"

import { populate_event } from "../../../this/api/event/populate"
import { POPULATE_BY_CONTENT_TYPE } from "../../../this/api/populate-by-content-type"

/**
 |
 | Draft preview. `status=draft` reaches the document service unchanged, which
 | is what makes the admin's Entry Preview show a page as it will be rather than
 | as it is.
 |
 | Worth being clear-eyed about: this route is public, so `status=draft` on it
 | is readable by anyone who asks for it. That matches the reference project and
 | webtools' own resolver, both of which forward the parameter from a public
 | caller, and it is what the spec asks for. It is recorded as a known exposure
 | rather than as an oversight.
 |
 */
const STATUSES = [ "draft", "published" ] as const

type Status = typeof STATUSES[number]

const MAXIMUM_PATH_LENGTH = 2048

export default {
	async find ( ctx ) {
		const path = read_path( ctx.query.path )

		if ( path === null ) {
			return ctx.badRequest(
				`"path" is required, and must be an absolute path of at most `
					+ `${MAXIMUM_PATH_LENGTH} characters.`,
			)
		}

		const status = read_status( ctx.query.status )

		if ( status === null ) {
			return ctx.badRequest(
				`"status" must be one of ${STATUSES.join( ", " )}.`,
			)
		}

		const { auth } = ctx.state

		const readable = await readable_content_types( auth )

		if ( readable.length === 0 ) {
			return ctx.forbidden()
		}

		const alias = await find_alias( path )

		if ( !alias || !readable.includes( alias.contenttype ) ) {
			return ctx.notFound()
		}

		const uid = alias.contenttype

		// The uid is only known at runtime, so the generated per-schema types
		// cannot narrow any of this. `url_alias` is likewise invisible to them:
		// webtools injects that relation in its own `register`, after the
		// types were generated from the schema files.
		const entry = await strapi.documents( uid as UID.ContentType )
			.findFirst( {
				filters: {
					url_alias: { documentId: alias.documentId },
				} as any,
				populate: POPULATE_BY_CONTENT_TYPE[uid] as any,
				status,
			} )

		if ( !entry ) {
			return ctx.notFound()
		}

		// The page shell and the entry's own event are lifted out **before**
		// sanitising, and each is sanitised in its own right against its own
		// schema.
		//
		// Not an evasion of the permission model, and worth spelling out
		// because it looks like one. `removeRestrictedRelations` drops any
		// relation whose target the caller cannot read, and Page Shell is
		// deliberately unroutable — it carries no page of its own, so it has no
		// content-API routes, so no `find` permission exists for anyone to hold.
		// Left in place the relation would simply vanish from every response.
		//
		// The envelope is the composition point: a caller authorised to read a
		// page is being handed that page, and a page's chrome is part of what a
		// page is. An Event is unroutable for the same reason, so the entry's
		// own event comes out here too and reaches the caller through the
		// resolved slot below rather than nested inside the entry.
		const { event, page_shell, ...entry_without_chrome } = entry as Record<
			string,
			any
		>

		// **The main event supplies the site chrome** — the header's date
		// range, the Register Now button, the footer's date line — on every
		// page, always, including archived ones.
		//
		// **The resolved event supplies page context** — colours, listing
		// filters and the schedule document. One rule: the entry's own event,
		// failing that the main event. Colour has a third level below both,
		// because no event may be marked main; that one is a hardcoded palette
		// and it lives in the website, which is where a null here degrades.
		//
		// The rule runs here rather than in the website because this is where
		// the data is, and because a page is one request and one cache key.
		const main_event = await find_main_event()
		const resolved_event = event ?? main_event

		ctx.body = {
			data: {
				entry: {
					...await sanitise( entry_without_chrome, uid, auth ),
					contentType: uid,
				},
				main_event: await sanitise_event( main_event, auth ),
				page_shell: page_shell
					? await sanitise(
						page_shell,
						"api::page-shell.page-shell",
						auth,
					)
					: null,
				resolved_event: await sanitise_event( resolved_event, auth ),
			},
			meta: {},
		}
	},
}

/**
 |
 | The one event carrying `main`. A middleware demotes the previous holder on
 | every write, so at most one row can answer.
 |
 | `findFirst` rather than a count-and-complain: if the invariant were ever
 | broken the chrome should still render, and the alternative is a whole site
 | answering 500 because two rows disagree about which event is running.
 |
 */
async function find_main_event () {
	return await strapi.documents( "api::event.event" ).findFirst( {
		filters: { main: true },
		populate: populate_event,
	} )
}

/**
 |
 | An event is sanitised against its own schema, in its own right, exactly as
 | the page shell is and for the same reason: it is never a route. It carries no
 | page and no URL, so no `find` permission exists for anyone to hold, and left
 | inside the entry `removeRestrictedRelations` would drop it from every
 | response with the join rows still sitting in the database.
 |
 | The envelope is the composition point. A caller authorised to read a page is
 | being handed that page, and which event that page belongs to is part of
 | what the page is.
 |
 */
async function sanitise_event ( event: unknown, auth: any ) {
	return event ? await sanitise( event, "api::event.event", auth ) : null
}

/**
 |
 | Through the content API's sanitiser, rather than out of the database raw:
 | private and hidden attributes are stripped, and so are relations this caller
 | has no business seeing.
 |
 */
async function sanitise (
	data: unknown,
	uid: string,
	auth: any,
): Promise<Record<string, unknown>> {
	return await strapi.contentAPI.sanitize.output(
		data as any,
		strapi.contentTypes[uid as UID.ContentType],
		{ auth },
	) as Record<string, unknown>
}

/**
 |
 | The content types this route can serve: those webtools resolves paths for,
 | narrowed to those with a populate fragment. A routable type with no fragment
 | would answer with an entry stripped of everything below its own columns,
 | which reads as an empty page rather than as a fault, so it is left
 | unserved instead.
 |
 */
function routable_content_types (): string[] {
	return Object.entries( strapi.contentTypes )
		.filter( ( [ uid, content_type ] ) =>
			( content_type as any )?.pluginOptions?.webtools?.enabled === true
			&& Object.prototype.hasOwnProperty.call(
				POPULATE_BY_CONTENT_TYPE,
				uid,
			)
		)
		.map( ( [ uid ] ) => uid )
}

/**
 |
 | Narrowed to the ones this caller may read, **before** any path is looked up.
 |
 */
async function readable_content_types ( auth: any ): Promise<string[]> {
	const readable: string[] = []

	for ( const uid of routable_content_types() ) {
		try {
			await strapi.auth.verify( auth, { scope: [ `${uid}.find` ] } )
			readable.push( uid )
		} catch {
			// Not readable by this caller. Its paths will answer 404, exactly
			// as a path that resolves to nothing does.
		}
	}

	return readable
}

/**
 |
 | Webtools' own alias lookup, reused rather than reimplemented: it iterates the
 | locales because the alias content type is localised, and a copy here would be
 | one more thing to keep in step with the plugin.
 |
 */
async function find_alias ( path: string ) {
	return await strapi
		.plugin( "webtools" )
		.service( "url-alias" )
		.findByPath( path ) as
			| { contenttype: string; documentId: string }
			| null
}

function read_path ( raw: unknown ): string | null {
	if ( typeof raw !== "string" ) {
		return null
	}

	if ( !raw.startsWith( "/" ) || raw.length > MAXIMUM_PATH_LENGTH ) {
		return null
	}

	return raw
}

function read_status ( raw: unknown ): Status | null {
	if ( raw === undefined ) {
		return "published"
	}

	return STATUSES.includes( raw as Status ) ? raw as Status : null
}
