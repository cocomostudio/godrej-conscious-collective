
/**
 |
 | The main event's date range, as the header and the footer both say it.
 |
 | Two `<time>` elements rather than one, because a range is two days and each
 | needs its own machine-readable value. An event running for a single day
 | renders one.
 |
 | It renders nothing at all when no event is marked main. That is the chrome
 | degrading rather than failing: a site with no current event should still
 | serve every page it has, without a date range where a date range would be a
 | lie.
 |
 */

import type { Event } from "../envelope.ts"

import { event_dates } from "../event-dates.ts"

type Event_Date_Range_Props = {
	event: Event | null
	/**
	 |
	 | What goes between the two days. The header sets the range tight and the
	 | footer spaces it out, which is how the design has each of them.
	 |
	 */
	separator?: string
}

export function Event_Date_Range (
	{ event, separator = "–" }: Event_Date_Range_Props,
) {
	const dates = event_dates( event )

	if ( !dates ) {
		return null
	}

	return <>
		<time dateTime={ dates.start.value }>{ dates.start.label }</time>
		{ dates.end && <>
			{ separator }
			<time dateTime={ dates.end.value }>{ dates.end.label }</time>
		</> }
	</>
}
