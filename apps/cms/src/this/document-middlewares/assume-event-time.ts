
/**
 |
 | A datetime written without saying where it is means **the city the event
 | runs in**, not the server's, and not UTC.
 |
 | The rule this enforces is the project's, not the platform's: every date and
 | time in this content model is a wall-clock time in Mumbai. An editor typing
 | eleven in the morning on the 27th of December means eleven in the morning
 | there, and a stored instant that says anything else is wrong in a way nobody
 | notices until a visitor arrives at the wrong hour.
 |
 | **What "without saying where it is" means.** An ISO string ending in `Z` or
 | in an offset carries its own answer and is left exactly as it arrived. A bare
 | `2025-12-27T11:00:00` does not, and JavaScript's own answer for it is the
 | *runtime's* zone — so the same seed run on a laptop in London and a container
 | in UTC would store two different instants from one source file. A date with
 | no time at all is worse: `new Date( "2025-12-27" )` is midnight **UTC** by
 | specification, which is half past five in the morning in Mumbai.
 |
 | It amends the write before `next()`, so the corrected value lands in the same
 | statement as the rest of the entry and nothing downstream — the middleware
 | that derives a session's dates, most of all — ever sees the ambiguous form.
 |
 | **What this does not reach.** Strapi's own admin datetime picker builds a
 | `Date` from the browser and sends `date.toISOString()`, so what arrives from
 | the admin is already unambiguous — and already resolved against *the
 | editor's* timezone rather than the event's. An editor working in Mumbai is
 | therefore correct and an editor working anywhere else is silently out by
 | their offset. Closing that means replacing the admin's input, which is a
 | larger piece of work than this middleware and is recorded rather than
 | attempted here.
 |
 */

import type { Core } from "@strapi/strapi"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"

/**
 |
 | Asia/Kolkata, as a fixed offset.
 |
 | Written as an offset rather than as a zone name because it is being appended
 | to a string rather than used to format one, and because India has no daylight
 | saving — the offset has not moved since 1945 and there is no rule to apply.
 |
 */
const EVENT_OFFSET = "+05:30"

/** Ends in `Z`, or in `+05:30` / `-0800` — the value says where it is. */
const SAYS_WHERE_IT_IS = /(?:Z|[+-]\d{2}:?\d{2})$/i

/** A bare `2025-12-27`, with no time at all. */
const A_DAY_ALONE = /^\d{4}-\d{2}-\d{2}$/

export function assume_event_time ( strapi: Core.Strapi ) {
	return async function amend_then_continue ( context, next ) {
		if ( !is_create_or_update( context ) ) {
			return await next()
		}

		const data = incoming_data( context )
		const attributes = strapi.contentTypes[context.uid]?.attributes

		if ( data && attributes ) {
			amend( strapi, data, attributes )
		}

		return await next()
	}
}

/**
 |
 | Every datetime the write carries, including the ones inside a component.
 |
 | A session's instances are a repeatable component, which is the only place a
 | datetime currently sits, and reaching them by walking the schema rather than
 | by naming them means the next content type to hold one is covered without
 | anybody remembering to come back here.
 |
 | Components nest at most three deep in this model and a component cannot
 | contain itself, so the walk terminates without a depth counter — the same
 | property the populate objects depend on.
 |
 */
function amend (
	strapi: Core.Strapi,
	data: Record<string, unknown>,
	attributes: Record<string, any>,
) {
	for ( const [ name, attribute ] of Object.entries( attributes ) ) {
		// Only what the caller sent. An update that does not mention an
		// attribute must not have it rewritten.
		if ( !( name in data ) ) {
			continue
		}

		if ( attribute?.type === "datetime" ) {
			data[name] = in_event_time( data[name] )
			continue
		}

		if ( attribute?.type !== "component" ) {
			continue
		}

		const nested = strapi.components[attribute.component]?.attributes

		if ( !nested ) {
			continue
		}

		for ( const row of rows_of( data[name] ) ) {
			amend( strapi, row, nested )
		}
	}
}

/**
 |
 | A component attribute arrives as one object or as a list of them, and
 | `params` is verbatim caller input, so neither shape can be assumed.
 |
 */
function rows_of ( value: unknown ): Record<string, unknown>[] {
	const rows = Array.isArray( value ) ? value : [ value ]

	return rows.filter( ( row ): row is Record<string, unknown> =>
		typeof row === "object" && row !== null
	)
}

/**
 |
 | The same moment, said unambiguously.
 |
 | A `Date` has already resolved to an instant and there is nothing left to
 | interpret, so it is handed back untouched.
 |
 */
export function in_event_time ( value: unknown ): unknown {
	if ( typeof value !== "string" ) {
		return value
	}

	const written = value.trim()

	if ( written === "" || SAYS_WHERE_IT_IS.test( written ) ) {
		return value
	}

	if ( A_DAY_ALONE.test( written ) ) {
		return `${written}T00:00:00.000${EVENT_OFFSET}`
	}

	// `2025-12-27 11:00:00` is what a hand-written value and several clients
	// send; the space is not legal ISO and Node parses it by a fallback path.
	return `${written.replace( " ", "T" )}${EVENT_OFFSET}`
}
