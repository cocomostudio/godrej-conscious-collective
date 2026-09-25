
/**
 |
 | Days, and moments within them, in one IANA timezone.
 |
 | A day is a plain `YYYY-MM-DD` string throughout, because a day has no
 | timezone of its own until one is chosen. Only the edges of a range are ever
 | turned into instants.
 |
 */

export const PERIODS = [
	"today",
	"yesterday",
	"this_week",
	"last_week",
	"this_month",
	"last_month",
	"this_year",
	"last_year",
] as const

export type Period = typeof PERIODS[number]

/** Both days are included. */
export type Day_Range = { start: string; end: string }

/**
 |
 | The days a calendar period covers, as seen from the day `today`. Weeks run
 | Monday to Sunday. "This week", "This month" and "This year" run up to
 | `today`.
 |
 */
export function resolve_period ( period: Period, today: string ): Day_Range {
	const { year, month } = parse_day( today )
	const monday = add_days( today, -( ( weekday_of( today ) + 6 ) % 7 ) )

	switch ( period ) {
		case "today":
			return { end: today, start: today }
		case "yesterday":
			return { end: add_days( today, -1 ), start: add_days( today, -1 ) }
		case "this_week":
			return { end: today, start: monday }
		case "last_week":
			return { end: add_days( monday, -1 ), start: add_days( monday, -7 ) }
		case "this_month":
			return { end: today, start: format_day( year, month, 1 ) }
		case "last_month":
			return {
				end: add_days( format_day( year, month, 1 ), -1 ),
				start: format_day( year, month - 1, 1 ),
			}
		case "this_year":
			return { end: today, start: format_day( year, 1, 1 ) }
		case "last_year":
			return {
				end: format_day( year - 1, 12, 31 ),
				start: format_day( year - 1, 1, 1 ),
			}
	}
}

/** The instants a range of days covers: from `from`, up to but not `until`. */
export function instants_of ( range: Day_Range, timezone: string ) {
	return {
		from: start_of_day( range.start, timezone ),
		until: start_of_day( add_days( range.end, 1 ), timezone ),
	}
}

/** Whether `value` names a real day, written as `YYYY-MM-DD`. */
export function is_day ( value: unknown ): value is string {
	if ( typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test( value ) ) {
		return false
	}

	const { year, month, day } = parse_day( value )

	return format_day( year, month, day ) === value
}

/** The day `instant` falls on in `timezone`, as `YYYY-MM-DD`. */
export function day_in ( timezone: string, instant: Date ): string {
	const { year, month, day } = wall_clock( instant, timezone )

	return format_day( year, month, day )
}

/** `instant` as `YYYY-MM-DD HH:mm` on the wall clock of `timezone`. */
export function minute_in ( timezone: string, instant: Date ): string {
	const { year, month, day, hour, minute } = wall_clock( instant, timezone )

	return `${format_day( year, month, day )} ${pad( hour )}:${pad( minute )}`
}

/**
 |
 | The first moment of `day` in `timezone`.
 |
 | The offset is read at a first guess and then again at the answer, because
 | the two differ when a daylight-saving change falls between them.
 |
 */
function start_of_day ( day: string, timezone: string ): Date {
	const { year, month, day: date } = parse_day( day )
	const wall = Date.UTC( year, month - 1, date )

	let instant = wall - offset_at( wall, timezone )
	instant = wall - offset_at( instant, timezone )

	return new Date( instant )
}

/** How far `timezone`'s wall clock runs ahead of UTC at `instant`, in ms. */
function offset_at ( instant: number, timezone: string ) {
	const { year, month, day, hour, minute, second } = wall_clock(
		new Date( instant ),
		timezone,
	)
	const wall = Date.UTC( year, month - 1, day, hour, minute, second )

	return wall - Math.floor( instant / 1000 ) * 1000
}

function wall_clock ( instant: Date, timezone: string ) {
	const parts = Object.fromEntries(
		formatter_for( timezone ).formatToParts( instant )
			.map( ( { type, value } ) => [ type, Number( value ) ] ),
	)

	return {
		day: parts.day,
		hour: parts.hour,
		minute: parts.minute,
		month: parts.month,
		second: parts.second,
		year: parts.year,
	}
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter_for ( timezone: string ) {
	let formatter = formatters.get( timezone )

	if ( !formatter ) {
		formatter = new Intl.DateTimeFormat( "en-US", {
			day: "numeric",
			hour: "numeric",
			hourCycle: "h23",
			minute: "numeric",
			month: "numeric",
			second: "numeric",
			timeZone: timezone,
			year: "numeric",
		} )
		formatters.set( timezone, formatter )
	}

	return formatter
}

function parse_day ( day: string ) {
	const [ year, month, date ] = day.split( "-" ).map( Number )

	return { day: date, month, year }
}

/** Normalises an out-of-range month or day, so month 0 is last December. */
function format_day ( year: number, month: number, day: number ) {
	return new Date( Date.UTC( year, month - 1, day ) ).toISOString()
		.slice( 0, 10 )
}

function add_days ( day: string, days: number ) {
	const { year, month, day: date } = parse_day( day )

	return format_day( year, month, date + days )
}

/** 0 is Sunday. */
function weekday_of ( day: string ) {
	const { year, month, day: date } = parse_day( day )

	return new Date( Date.UTC( year, month - 1, date ) ).getUTCDay()
}

function pad ( value: number ) {
	return String( value ).padStart( 2, "0" )
}
