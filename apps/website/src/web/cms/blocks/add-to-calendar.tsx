
/**
 |
 | Add to Calendar, at the foot of a session's sidebar.
 |
 | It leans on the platform rather than on a service. The href points at this
 | site's own `/calendar.ics`, which answers with an iCalendar file — and a
 | phone handed one opens its own calendar's "Add event" sheet, whichever
 | calendar that is. No dropdown, no account, and nothing to choose: the
 | visitor's device already knows where their diary is.
 |
 | ─── AN ANCHOR, AND WITHOUT `download` ──────────────────────────────────────
 |
 | An anchor because it is a link to a file, which also makes it work with a
 | middle click and a right-click — the same reasoning the schedule's download
 | control carries.
 |
 | **Without** `download`, deliberately. That attribute is what tells a browser
 | to file something away rather than open it, and on a phone it is the
 | difference between the calendar sheet appearing and an .ics landing silently
 | in Downloads. The content type and the disposition do the rest.
 |
 | ─── WHICH SITTING, AND WHETHER AT ALL ──────────────────────────────────────
 |
 | A session with three instances can only add one of them, and the one worth
 | offering is the earliest still to come. That is a question about the clock,
 | and this component is not allowed to read the clock while rendering: page
 | responses are cached, so an answer computed during rendering would be frozen
 | into the cache and go quietly wrong for everybody served it afterwards.
 |
 | So the server renders the earliest instance outright, and the browser
 | corrects it on arrival — including to nothing at all, once every instance is
 | over. See `use_client_now` and `upcoming_link`.
 |
 */

import type { Calendar_Link } from "../calendar-links.ts"

import { upcoming_link } from "../calendar-links.ts"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"
import { use_client_now } from "#infra/lib/ui/react/use-client-now.ts"

export function Add_To_Calendar (
	{ links = [] }: { links?: Calendar_Link[] },
) {
	const offered = upcoming_link( links, use_client_now() )

	// Nothing left to add — every instance is over — or nothing to add at all:
	// a session with no instances, or a deployment with no signing secret, so
	// no link this server could honour. A control that fails on press is worse
	// than one that is not drawn.
	if ( !offered ) {
		return null
	}

	// The top margin is the block's own: the details list above it is a
	// sibling in the same stack, and the gap between the two belongs to
	// whichever of them can be absent — this one.
	return <Button
		className="md:mt-8"
		color="context"
		emphasis="solid"
		render={ <a href={ offered.href } /> }>
		<Button.Icon name="calendar" />
		Add to Calendar
	</Button>
}
