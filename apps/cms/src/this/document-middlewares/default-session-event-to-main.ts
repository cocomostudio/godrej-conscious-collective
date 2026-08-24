
/**
 |
 | A new session belongs to the event that is running, without an
 | editor choosing it.
 |
 | **On creation only.** `Session.event` is required, and that requirement is
 | the point: a session with no event would silently take on whichever event is
 | main at the time, so its meaning would change the day a new event is
 | marked main. Filling it once, at creation, pins it — and an editor who moves
 | a session to another event afterwards is not overruled on the next save.
 |
 | **`required` and a filling middleware do not fight here, and they do on
 | `page_shell`.** The difference is the admin: its client-side schema builds a
 | relation as a `yup.lazy`, which has no `required` to apply, so a required
 | relation reaches the document service unvalidated and this middleware runs
 | before the server-side check. A required scalar or component would be
 | refused in the browser and the middleware would never see the write.
 |
 | It amends the write before `next()`, so the event lands in the same
 | statement as the rest of the session.
 |
 */

import type { Core } from "@strapi/strapi"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"
import { relation_emptiness } from "./relation-emptiness"

const UID = "api::session.session"
const EVENT_UID = "api::event.event"
const ATTRIBUTE = "event"

export function default_session_event_to_main ( strapi: Core.Strapi ) {
	return async function fill_then_continue ( context, next ) {
		if ( !is_create_or_update( context, UID ) ) {
			return await next()
		}

		if ( context.action !== "create" ) {
			return await next()
		}

		const data = incoming_data( context )

		if ( !data ) {
			return await next()
		}

		// On a create there is no previous value for "unchanged" to refer to,
		// so anything short of an actual event — including the
		// `{ connect: [], disconnect: [] }` the admin sends for a relation the
		// editor left alone — is a session arriving without one.
		if ( relation_emptiness( data[ATTRIBUTE] ) === "filled" ) {
			return await next()
		}

		const main = await main_event( strapi )

		if ( main ) {
			data[ATTRIBUTE] = main.documentId
		}

		return await next()
	}
}

/**
 |
 | `strapi.db.query`, not `strapi.documents`: a document-service read from
 | inside a middleware re-enters the chain from index zero, and this middleware
 | is in that chain.
 |
 */
async function main_event ( strapi: Core.Strapi ) {
	return await strapi.db.query( EVENT_UID ).findOne( {
		select: [ "documentId" ],
		where: { main: true },
	} ) as { documentId: string } | null
}
