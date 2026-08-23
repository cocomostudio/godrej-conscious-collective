
/**
 |
 | Populate fragment for `api::event.event`.
 |
 | An event is never resolved from a path of its own — it has no page and no
 | URL. It reaches the website through an entry's envelope, twice: once as the
 | main event, which supplies the site chrome, and once as the resolved event,
 | which supplies colours, listing filters and the schedule document.
 |
 | Only the schedule needs populating. Everything else an event holds is a
 | column on its own row, and the six RGB triplets travel with them.
 |
 */

export const populate_event = {
	schedule: true,
}
