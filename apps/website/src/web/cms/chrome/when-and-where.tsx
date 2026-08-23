
/**
 |
 | When the event is on, and where.
 |
 | The dates are the **main event's**, like everything else in the chrome.
 |
 | **The opening hours and the address are not.** Nothing in the content model
 | holds either: an Event carries a date range and a schedule document, and a
 | venue is a Session attribute rather than an edition-wide one. So these two
 | lines are still the literals the static site shipped, and an editor cannot
 | change them — which is the exact complaint this whole project exists to
 | answer, sitting in the footer of every page.
 |
 | They are kept rather than dropped because the design shows them and dropping
 | them would be a silent regression, and because inventing attributes the spec
 | does not name is worse than carrying a flagged one. Whoever adds
 | `time_start`, `time_end` and `venue` to Event deletes this comment with them.
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

		<p className="text-small font-medium">
			<time dateTime="09:00">9:00 AM</time>
			{ " – " }
			<time dateTime="22:00">10:00 PM</time>
		</p>

		<p className="text-small font-medium">
			Plant 13, Godrej Enterprises Group, Pirojshanagar, Vikhroli,
			Mumbai 400079
		</p>
	</div>
}
