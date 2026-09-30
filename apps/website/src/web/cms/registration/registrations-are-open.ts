
/**
 |
 | Whether anything on the page should offer the registration form.
 |
 | It follows the **main event**, like the rest of the chrome. With no event
 | running there is nothing to register for, and an event can also close its
 | registrations while it is still the main event.
 |
 | Only an explicit `false` closes them. Every event saved before the attribute
 | existed reads back `null`, because a schema default is written when a row is
 | saved and not when one is read, and those events were open.
 |
 */

import type { Event } from "../envelope.ts"

export function registrations_are_open (
	main_event: Event | null,
): main_event is Event {
	return main_event !== null
		&& main_event.registrations_are_open !== false
}
