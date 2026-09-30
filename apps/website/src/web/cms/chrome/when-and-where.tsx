
/**
 |
 | When the event is on, and where.
 |
 | The dates and the daily hours are the **main event's**, like everything else
 | in the chrome.
 |
 | **The address is not.** Nothing in the content model holds it: a venue is a
 | Session attribute rather than an event-wide one. So that line is still the
 | literal the static site shipped, and an editor cannot change it.
 |
 | It is kept rather than dropped because the design shows it and dropping it
 | would be a silent regression, and because inventing an attribute nobody has
 | named is worse than carrying a flagged one. Whoever adds a `venue` to Event
 | deletes this comment with it.
 |
 */

import type { Event } from "../envelope.ts"

import { Event_Date_Range } from "./event-date-range.tsx"

type When_And_Where_Props = {
	event: Event | null
	colour_scheme?: "light" | "dark"
	className?: string
}

export function When_And_Where (
	{ className = "", colour_scheme = "dark", event }: When_And_Where_Props,
) {
	const colour_scheme_classes = colour_scheme === "light"
		? "cs-light bg-gray-light text-black"
		: "cs-dark bg-black text-white"

	return <div className={ `space-y-4 ${colour_scheme_classes} ${className}` }>
		{ event && <p className="text-h5 [.cs-light_&]:text-theme font-medium">
			RSVP For <Event_Date_Range event={ event } separator=" – " />
		</p> }

		{ event && <Daily_Hours event={ event } /> }

		<p className="text-small font-medium">
			Plant 13, Godrej Enterprises Group, Pirojshanagar, Vikhroli,
			Mumbai 400079
		</p>
	</div>
}

/**
 |
 | When the doors open and when the day ends, across every day of the event.
 |
 | **No start, no line.** An end with nothing before it is half a time, and a
 | visitor reading it cannot tell when to arrive. A start with no end is still
 | useful, and reads "onwards".
 |
 | **The times are the venue's wall clock**, as an editor typed them, and they
 | go through no timezone conversion: a `Date` would read them in whichever zone
 | the server happens to run in.
 |
 */
function Daily_Hours ( { event }: { event: Event } ) {
	const start = clock_time_of( event.time_start )
	const end = clock_time_of( event.time_end )

	if ( !start ) {
		return null
	}

	return <p className="text-small font-medium">
		<time dateTime={ start.value }>{ start.label }</time>
		{ end
			? <>
				{ " – " }
				<time dateTime={ end.value }>{ end.label }</time>
			</>
			: " onwards" }
	</p>
}

const CLOCK_TIME = /^(\d{2}):(\d{2})/

/**
 |
 | `"21:30:00.000"` → `{ value: "21:30", label: "9:30 PM" }`, or nothing.
 |
 */
function clock_time_of ( stored: string | null | undefined ) {
	const found = typeof stored === "string" ? CLOCK_TIME.exec( stored ) : null

	if ( !found ) {
		return null
	}

	const [ , hours, minutes ] = found
	const hour = Number( hours )

	return {
		label: `${hour % 12 || 12}:${minutes} ${hour < 12 ? "AM" : "PM"}`,
		value: `${hours}:${minutes}`,
	}
}
