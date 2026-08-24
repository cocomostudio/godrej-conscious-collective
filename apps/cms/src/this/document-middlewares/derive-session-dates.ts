
/**
 |
 | A session's first and last dates follow from its instances.
 |
 | The two attributes are stored rather than computed on read because a listing
 | filters and sorts on them, and a filter cannot reach into a repeatable
 | component's rows to find the earliest one. They are hidden and not editable
 | in the admin's form, and shown in its list view, which is where an editor
 | checks that they are what they expect.
 |
 | It amends the write before `next()`, so the dates land in the same statement
 | as the instances they were derived from and there is no window in which the
 | two disagree. A write that does not mention `instances` leaves both alone —
 | an update touching only the price must not blank a session's dates.
 |
 */

import type { Core } from "@strapi/strapi"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"

const UID = "api::session.session"
const INSTANCES = "instances"
const FIRST = "session_date_first"
const LAST = "session_date_last"

/**
 |
 | **The date portion is the date where the event is.**
 |
 | An instance is a datetime and is stored as an instant, so "the date portion"
 | is only a question with an answer once a place is named. Slicing the stored
 | string would answer it in UTC, which is right for every hour this event
 | actually runs and wrong for the small hours — and wrong silently, which is
 | the failure this project has. The event is in one city, which is the same
 | reason the price stores no currency.
 |
 */
const EVENT_TIMEZONE = "Asia/Kolkata"

// `en-CA` is the locale whose short date format is already `YYYY-MM-DD`, which
// is the shape a Strapi `date` attribute stores.
const AS_A_DATE = new Intl.DateTimeFormat( "en-CA", {
	day: "2-digit",
	month: "2-digit",
	timeZone: EVENT_TIMEZONE,
	year: "numeric",
} )

export function derive_session_dates ( _strapi: Core.Strapi ) {
	return async function derive_then_continue ( context, next ) {
		if ( !is_create_or_update( context, UID ) ) {
			return await next()
		}

		const data = incoming_data( context )

		if ( !data || !( INSTANCES in data ) ) {
			return await next()
		}

		const dates = dates_of( data[INSTANCES] )

		data[FIRST] = dates[0] ?? null
		data[LAST] = dates[dates.length - 1] ?? null

		return await next()
	}
}

/**
 |
 | Every day an instance touches, in order, deduplicated.
 |
 | Both ends of an instance count: an instance that starts before midnight
 | and ends after it runs on two days, and the last of them is the session's last
 | date. An instance whose datetimes cannot be read contributes nothing rather
 | than contributing `Invalid Date`.
 |
 */
function dates_of ( instances: unknown ): string[] {
	if ( !Array.isArray( instances ) ) {
		return []
	}

	const days = new Set<string>()

	for ( const instance of instances ) {
		for ( const end of [ "time_start", "time_end" ] ) {
			const day = as_a_date(
				( instance as Record<string, unknown> )
					?.[end],
			)

			if ( day ) {
				days.add( day )
			}
		}
	}

	return [ ...days ].sort()
}

function as_a_date ( value: unknown ): string | null {
	if ( value === null || value === undefined || value === "" ) {
		return null
	}

	const moment = value instanceof Date ? value : new Date( value as string )

	return Number.isNaN( moment.getTime() ) ? null : AS_A_DATE.format( moment )
}
