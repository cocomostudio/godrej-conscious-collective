
/**
 |
 | Add to Calendar — **a stub**, and deliberately one.
 |
 | The button is what the design shows at the foot of a session's sidebar, and
 | the spec puts producing a calendar entry out of scope for this effort. It is
 | rendered rather than left out for the same reason Register Now is: the
 | design has it, and a sidebar missing it would read as a regression rather
 | than as work not yet done.
 |
 | It is disabled rather than inert. A control that looks pressable and does
 | nothing when pressed is worse than one that says it is not ready — and the
 | static site's own version, an anchor pointing at `example.com`, is exactly
 | that control.
 |
 | Everything it will need is already stored: **both ends of an instance are
 | datetimes even for an all-day session**, which is the whole reason the stored
 | shape does not change when the website reads "All day".
 |
 */

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

export function Add_To_Calendar () {
	return <Button color="context" disabled emphasis="solid">
		<Button.Icon name="calendar" />
		Add to Calendar
	</Button>
}
