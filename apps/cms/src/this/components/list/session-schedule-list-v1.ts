
/**
 |
 | Populate fragment for `list.session-schedule-list-v1`.
 |
 | **The component in the catalogue that stores almost nothing.** An editor
 | places it and that is very nearly the whole of the decision: which sessions
 | it shows follows from the event the page resolved to, and every session of
 | that event is shown because a schedule that left some out would not be a
 | schedule. All it holds of its own is `spacing_around`, which is a scalar and
 | needs no branch here.
 |
 | So there is nothing to populate, and it is named here for the reason every
 | empty fragment is: the section list needs an entry for every component the
 | zone admits, and a component missing from that map arrives with no
 | attributes at all.
 |
 | Its rows and its schedule document are spliced in afterwards, by
 | `src/this/api/listings.ts`.
 |
 */

export const populate_session_schedule_list_v1 = {}
