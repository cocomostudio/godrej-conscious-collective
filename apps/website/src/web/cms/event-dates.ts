
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

/**
 |
 | The same twelve, unabbreviated.
 |
 | One place says the range in full and it is the registration form's headline —
 | "RSVP for 11-14 December 2025" — which is how the design has it and which is
 | a different sentence from the header's "11–14 Dec 2025".
 |
 | The two differ in three ways at once: the month table, the separator (a
 | hyphen against an en dash), and the shape of the result — `event_range_in_full`
 | answers one string, because it sits INSIDE a sentence, where `date_range`
 | answers two labelled ends because each needs its own `<time>` element. Only
 | the "shortest that still reads" rule is shared, and it is four lines. That
 | is why there are two functions rather than one with a bag of options: the
 | options would outnumber what they configure.
 |
 */
const MONTHS_IN_FULL = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
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

/**
 |
 | One bare day, split into the parts a badge sets out separately.
 |
 | Same rule as everything else here: a `date` attribute is never parsed into an
 | instant, because the runtime's own timezone would then sit between the day an
 | editor typed and the day a visitor reads.
 |
 */
export type Day_Parts = {
	day: number
	month: string
	/** The machine-readable day, for a `<time>` element's `dateTime`. */
	value: string
}

export function day_parts (
	value: string | null | undefined,
): Day_Parts | null {
	const parsed = parse( value )

	return parsed
		? { day: parsed.day, month: MONTHS[parsed.month], value: parsed.raw }
		: null
}

/**
 |
 | One bare day, as a day tab and a day filter name it: "11th Dec".
 |
 | The ordinal is the design's — the schedule's day tabs and the filtration
 | widget's date facet both read this way, and both are naming the same days, so
 | they say it the same way from one place.
 |
 | Split rather than parsed, like everything else here.
 |
 */
export function ordinal_day ( value: string | null | undefined ): string | null {
	const parsed = parse( value )

	return parsed
		? `${parsed.day}${ordinal_suffix( parsed.day )} ${
			MONTHS[parsed.month]
		}`
		: null
}

function ordinal_suffix ( day: number ): string {
	// The teens are the exception every ordinal table has: 11, 12 and 13 take
	// "th" although 1, 2 and 3 do not.
	if ( day > 3 && day < 21 ) {
		return "th"
	}

	switch ( day % 10 ) {
		case 1:
			return "st"
		case 2:
			return "nd"
		case 3:
			return "rd"
		default:
			return "th"
	}
}

export function event_dates ( event: Event | null ): Event_Dates | null {
	return date_range( event?.date_start, event?.date_end )
}

/**
 |
 | An event's range as one string, with the month written out: "11-14 December
 | 2025", or "11 December 2025" for an event running a single day.
 |
 | The registration form's headline, and only that. It is one string rather than
 | two `<time>` elements because it sits inside a sentence — "RSVP for …" —
 | rather than standing on its own as the header's does.
 |
 | Null when the event carries no dates, which is what lets the headline fall
 | back to a line that promises nothing.
 |
 */
export function event_range_in_full ( event: Event | null ): string | null {
	const start = parse( event?.date_start )
	const end = parse( event?.date_end )

	if ( !start ) {
		return null
	}

	const in_full = ( date: Parsed ) =>
		`${date.day} ${MONTHS_IN_FULL[date.month]} ${date.year}`

	if ( !end || same_day( start, end ) ) {
		return in_full( start )
	}

	// The same rule as the abbreviated range: the opening half carries only
	// what the closing half cannot say for it.
	const opening = start.year !== end.year
		? in_full( start )
		: start.month !== end.month
		? `${start.day} ${MONTHS_IN_FULL[start.month]}`
		: String( start.day )

	// A hyphen with no spaces, which is what the design has for this line —
	// unlike the header's en dash. The two are different typographic
	// decisions about different sentences, not an inconsistency.
	return `${opening}-${in_full( end )}`
}

/**
 |
 | The same rule, over two bare days rather than over an event.
 |
 | A session's first and last dates read exactly as an event's range does, and
 | they are `date` attributes for the same reason — so they take the same
 | formatting rather than a second one that could drift from it by a comma.
 |
 */
export function date_range (
	first: string | null | undefined,
	last: string | null | undefined,
): Event_Dates | null {
	const start = parse( first )
	const end = parse( last )

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
