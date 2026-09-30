
/**
 |
 | Populate fragment for `api::event.event`.
 |
 | An event is never resolved from a path of its own — it has no page and no
 | URL. It reaches the website through an entry's envelope, twice: once as the
 | main event, which supplies the site chrome, and once as the resolved event,
 | which supplies colours, listing filters and the schedule document.
 |
 | Everything else an event holds is a column on its own row — the dates and
 | the daily hours among them — and travels without being asked for. The six
 | palette colours do not: each is a component, and a component left out of
 | the populate object is silently absent from the response. Every one of
 | their colours is a column on the component's own row, triplets included,
 | so `true` reaches all of them.
 |
 */

export const populate_event = {
	contributor: true,
	conversation: true,
	experience: true,
	schedule: true,
	showcase: true,
	theme: true,
	workshop: true,
}
