
/**
 |
 | An event whose first day falls after its last day is refused.
 |
 | It throws **before** `next()`, which is the only place a middleware can
 | refuse anything. The write's transaction opens inside `next()`, so a
 | middleware that let the write proceed and then threw would leave the bad row
 | committed and hand the caller an error about it — the worst of both.
 |
 | Refusing means reading the stored row first, because an update carries only
 | the attributes the caller sent: moving the first day alone has to be checked
 | against the last day already in the database, not against nothing.
 |
 */

import type { Core } from "@strapi/strapi"

import { errors } from "@strapi/utils"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"

const UID = "api::event.event"

export function reject_inverted_date_range ( strapi: Core.Strapi ) {
	return async function refuse_or_continue ( context, next ) {
		if ( !is_create_or_update( context, UID ) ) {
			return await next()
		}

		const data = incoming_data( context )

		if ( !data ) {
			return await next()
		}

		const stored = await stored_row( strapi, context )

		const date_start = as_day(
			"date_start" in data ? data.date_start : stored?.date_start,
		)
		const date_end = as_day(
			"date_end" in data ? data.date_end : stored?.date_end,
		)

		if ( date_start && date_end && date_start > date_end ) {
			throw new errors.ValidationError(
				`This event's first day (${date_start}) falls after its last `
					+ `day (${date_end}).`,
			)
		}

		return await next()
	}
}

/**
 |
 | `strapi.db.query`, never `strapi.documents`: a document-service call from
 | inside a middleware re-enters the chain from index zero, so reading the event
 | here through the document service would re-enter this middleware, which would
 | read the event again.
 |
 */
async function stored_row ( strapi: Core.Strapi, context ) {
	const document_id = context.params?.documentId

	if ( !document_id ) {
		return null
	}

	return await strapi.db.query( UID ).findOne( {
		select: [ "date_start", "date_end" ],
		where: { documentId: document_id },
	} ) as { date_start?: string; date_end?: string } | null
}

/**
 |
 | Both ends are `date` attributes, so both are ordered by their `YYYY-MM-DD`
 | prefix and comparing the strings is comparing the days.
 |
 | Taking the prefix rather than parsing is deliberate. `params` is verbatim
 | caller input, so a value arrives as a `Date`, as `2025-12-11`, or as a full
 | ISO instant with an offset — and parsing the last of those puts a timezone
 | between an editor typing a day and the check on it.
 |
 */
function as_day ( value: unknown ): string | null {
	if ( value instanceof Date ) {
		return value.toISOString().slice( 0, 10 )
	}

	if ( typeof value !== "string" || value === "" ) {
		return null
	}

	return value.slice( 0, 10 )
}
