
/**
 |
 | The schedule, as a list of entries rather than a list of sessions.
 |
 | **One entry per instance.** A session running on three days is three things
 | to plan around, at three different hours, and a schedule that listed it once
 | would be answering "when is this on" with three answers in one row. It is the
 | reason the schedule's rows carry their instances at all, and the reason its
 | count is larger than the number of sessions the CMS sent.
 |
 | Chronological, across every session and every category, because that is what
 | a day looks like to somebody standing in it.
 |
 | The day an entry belongs to is worked out **where the event is** — see
 | `day_key` — so an evening session lands on the evening's day rather than on
 | whatever day it is where the page happened to be rendered.
 |
 */

import type {
	Session_Instance,
	Session_Schedule_Row,
} from "../envelope.ts"

import { day_key } from "../sessions.ts"

export type Schedule_Entry = {
	/**
	 |
	 | Unique across the list: a session appears once per instance, so its
	 | document id alone would repeat.
	 |
	 */
	key: string
	session: Session_Schedule_Row
	instance: Session_Instance
	/** `2025-12-11`, where the event is. Null where the instance has no start. */
	day: string | null
}

export function schedule_entries (
	sessions: Session_Schedule_Row[],
): Schedule_Entry[] {
	return sessions
		.flatMap( ( session ) =>
			( Array.isArray( session.instances ) ? session.instances : [] )
				.map( ( instance, index ) => ( {
					day: day_key( instance?.time_start ),
					instance,
					key: `${session.documentId}/${index}`,
					session,
				} ) )
		)
		.sort( by_start_time )
}

/**
 |
 | Soonest first. The starts are ISO instants, which sort correctly as strings
 | only when they carry the same offset — they do not, necessarily — so they are
 | compared as instants.
 |
 | An instance with no start sorts last rather than first: it cannot be planned
 | around, and putting it at the head of the day would push everything that can
 | be planned around below it.
 |
 */
function by_start_time ( one: Schedule_Entry, other: Schedule_Entry ) {
	return moment( one ) - moment( other )
}

function moment ( entry: Schedule_Entry ): number {
	const start = entry.instance?.time_start

	if ( typeof start !== "string" ) {
		return Number.POSITIVE_INFINITY
	}

	const parsed = Date.parse( start )

	return Number.isNaN( parsed ) ? Number.POSITIVE_INFINITY : parsed
}

/**
 |
 | The days the schedule is divided into, ascending, one per tab.
 |
 | Taken from the whole loaded set rather than from what survives the filters:
 | the tabs are a fixed set, so filtering narrows what sits under a day rather
 | than taking the day away — and a bar whose segments changed width as a
 | visitor filtered would be measuring something different each time.
 |
 */
export function schedule_days ( entries: Schedule_Entry[] ): string[] {
	return [
		...new Set(
			entries
				.map( ( entry ) => entry.day )
				.filter( ( day ): day is string => day !== null ),
		),
	].sort()
}

/**
 |
 | The id a day tab links to, and the id the first entry of that day carries.
 |
 | One function for both ends, because a tab pointing at a fragment nothing
 | renders is a link that silently does nothing — which is what the static site
 | ships, its tabs all pointing at `#`.
 |
 | Keyed by the day rather than by its position, so the anchor a visitor copies
 | out of the address bar still means the same day once the programme grows a
 | day at the front.
 |
 */
export function day_anchor ( day: string ): string {
	return `day-${day}`
}
