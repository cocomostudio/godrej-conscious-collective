
/**
 |
 | An event's date range, as the header and the footer say it.
 |
 | "11–14 Dec 2025" — the month and the year are said once, at the end, and only
 | the parts that differ are repeated. An event crossing a month reads
 | "28 Nov – 2 Dec 2025"; one crossing a year says both.
 |
 | Formatted by hand rather than through `Intl`. Both ends are date-only values,
 | so parsing them into instants would put the server's timezone between the day
 | an editor typed and the day a visitor reads — an event starting on the 11th
 | rendering as the 10th west of UTC. Splitting the string never does that, and
 | the site is written in one language, so a formatter buys nothing to offset
 | the risk.
 |
 */

import type { Event } from "./envelope.ts"

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
]

/** One end of the range: the machine-readable day and what a reader sees. */
export type Event_Day = {
	value: string
	label: string
}

export type Event_Dates = {
	start: Event_Day
	/** Null when the event runs for a single day, and there is no range. */
	end: Event_Day | null
}

export function event_dates ( event: Event | null ): Event_Dates | null {
	const start = parse( event?.date_start )
	const end = parse( event?.date_end )

	if ( !start ) {
		return null
	}

	if ( !end || same_day( start, end ) ) {
		return { end: null, start: { label: full( start ), value: start.raw } }
	}

	return {
		end: { label: full( end ), value: end.raw },
		start: {
			label: shortest_that_still_reads( start, end ),
			value: start.raw,
		},
	}
}

type Parsed = {
	raw: string
	year: string
	month: number
	day: number
}

function parse ( value: unknown ): Parsed | null {
	if ( typeof value !== "string" ) {
		return null
	}

	const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec( value )

	if ( !parts ) {
		return null
	}

	const [ , year, month, day ] = parts

	return {
		day: Number( day ),
		month: Number( month ) - 1,
		raw: value.slice( 0, 10 ),
		year,
	}
}

function full ( date: Parsed ) {
	return `${date.day} ${MONTHS[date.month]} ${date.year}`
}

/**
 |
 | The opening half of the range carries only what the closing half cannot say
 | for it. Within one month that is the day alone; across months, the day and
 | the month; across years, everything.
 |
 */
function shortest_that_still_reads ( start: Parsed, end: Parsed ) {
	if ( start.year !== end.year ) {
		return full( start )
	}

	if ( start.month !== end.month ) {
		return `${start.day} ${MONTHS[start.month]}`
	}

	return String( start.day )
}

function same_day ( start: Parsed, end: Parsed ) {
	return start.raw === end.raw
}
