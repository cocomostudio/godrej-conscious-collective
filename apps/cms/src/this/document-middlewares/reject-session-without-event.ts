
/**
 |
 | A session with no event is refused.
 |
 | `Session.event` is declared `required` and **Strapi enforces none of it for a
 | relation.** Measured against 5.52.1: the admin's client-side schema builds a
 | relation as a `yup.lazy`, which has no `required` to apply; the document
 | service's own validation refuses a missing required *scalar* and lets a
 | missing required relation through; and publishing an entry with the relation
 | empty succeeds without a word. A required string is refused at every one of
 | those points, which is what makes the gap easy to miss.
 |
 | So the requirement is this middleware. It matters because of what a session
 | with no event means: nothing reads the attribute as null — the resolution
 | rule falls through to the main event — so the session would quietly change
 | which event it belongs to on the day a new one is marked main.
 |
 | It runs **after** the filling middleware and **before** `next()`, which is
 | the only place a middleware can refuse anything. So an editor who names no
 | event is given the main one, and only a session that could not be given one —
 | because no event is marked main — is refused.
 |
 | An update is refused only when it says, explicitly, to empty the attribute.
 | An update that does not mention it, or that carries the admin's
 | `{ connect: [], disconnect: [] }`, leaves the stored event exactly as it was
 | and is none of this middleware's business.
 |
 */

import type { Core } from "@strapi/strapi"

import { errors } from "@strapi/utils"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"
import { relation_emptiness } from "./relation-emptiness"

const UID = "api::session.session"
const ATTRIBUTE = "event"

const REFUSAL = `A session must belong to an event. None was given, and no `
	+ `event is marked as the main one to fall back on.`

export function reject_session_without_event ( _strapi: Core.Strapi ) {
	return async function refuse_or_continue ( context, next ) {
		if ( !is_create_or_update( context, UID ) ) {
			return await next()
		}

		const data = incoming_data( context )

		if ( !data ) {
			return await next()
		}

		if ( context.action === "create" ) {
			if ( relation_emptiness( data[ATTRIBUTE] ) !== "filled" ) {
				throw new errors.ValidationError( REFUSAL )
			}

			return await next()
		}

		if (
			ATTRIBUTE in data
			&& relation_emptiness( data[ATTRIBUTE] ) === "empty"
		) {
			throw new errors.ValidationError( REFUSAL )
		}

		return await next()
	}
}
