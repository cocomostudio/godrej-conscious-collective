
/**
 |
 | `GET /calendar.ics` — the file behind Add to Calendar.
 |
 | A resource route: no component, no markup, one iCalendar document. It is
 | **outside the layout and ahead of the splat**, for the two reasons the
 | registration routes are — there is nothing to lay out, and `*` matches
 | everything including this.
 |
 | ─── IT ASKS THE CMS NOTHING ────────────────────────────────────────────────
 |
 | Everything the entry is made of arrives in the query string, put there by
 | the page that drew the button. So this is a formatter rather than a route
 | with a lookup in it: no fetch, no alias resolution, no envelope, and no way
 | for a tap to be slow because the CMS is.
 |
 | It also means the address cannot go stale against an editor's changes the
 | way a lookup would go fresh. That is the right trade here: the href is
 | rebuilt from live content every time the page is rendered, and the file is
 | fetched once, immediately, by somebody who is looking at that page.
 |
 | ─── AND IT TRUSTS NOTHING ──────────────────────────────────────────────────
 |
 | A query string is the least trustworthy input there is, so:
 |
 |   • the signature is checked first, and an address this server did not mint
 |     is a 404 rather than an error — there is nothing here to explain to
 |     whoever sent it;
 |
 |   • the link back is built from the `path` parameter against **this
 |     server's own origin**, never taken as an address;
 |
 |   • `nosniff` and an attachment disposition keep the body a file. It is
 |     text this endpoint was handed, and a browser that sniffed it as HTML
 |     rather than believing the content type would be running that text as a
 |     document on this site's origin.
 |
 */

import type { Route } from "./+types/calendar.route.ts"

import {
	calendar_uid,
	ics_document,
} from "./calendar-entry.ts"
import { verify_calendar_link } from "./calendar-signing.server.ts"

/**
 |
 | Fetched once, at the moment of a tap, and never usefully again. Caching it
 | buys nothing and risks a calendar entry cut from content an editor has since
 | changed, so nothing stores it.
 |
 */
const HEADERS = {
	"cache-control": "no-store",
	"content-type": "text/calendar; charset=utf-8",
	"x-content-type-options": "nosniff",
}

export async function loader ( { request }: Route.LoaderArgs ) {
	const url = new URL( request.url )
	const instance = verify_calendar_link( url.searchParams )

	if ( !instance ) {
		return new Response( null, { status: 404 } )
	}

	const address = instance.path
		? new URL( instance.path, url.origin ).toString()
		: null

	const document = ics_document( {
		description: description_of( instance.note, address ),
		end: instance.end,
		location: instance.at,
		stamped_at: new Date(),
		start: instance.start,
		summary: instance.title,
		uid: calendar_uid( {
			host: url.host,
			path: instance.path ?? instance.title,
			start: instance.start,
		} ),
		url: address,
	} )

	return new Response( document, {
		headers: {
			...HEADERS,
			"content-disposition": `attachment; filename="${
				filename_of( instance.path )
			}"`,
		},
	} )
}

/**
 |
 | The session's own line, and a way back to the page it came from.
 |
 | Both are optional and the two are joined by a blank line, so an entry with
 | only one of them does not carry a stray gap into somebody's calendar.
 |
 */
function description_of ( note: string | null, address: string | null ) {
	const parts = [ note, address ].filter( ( part ): part is string =>
		Boolean( part )
	)

	return parts.length > 0 ? parts.join( "\n\n" ) : null
}

/**
 |
 | Named after the session, so a downloaded file is recognisable in a folder.
 |
 | Derived from the path rather than from the title: a title is an editor's
 | free text and would need escaping to survive a header, while a path is
 | already the shape of a filename.
 |
 */
function filename_of ( path: string | null ) {
	const last = ( path ?? "" ).split( "/" ).filter( Boolean ).at( -1 )
	const safe = ( last ?? "" ).replace( /[^a-zA-Z0-9._-]/g, "" )

	return `${safe || "event"}.ics`
}
