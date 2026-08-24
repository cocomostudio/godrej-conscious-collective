
/**
 |
 | Document-service middlewares.
 |
 | Every invariant that cannot be expressed in a schema lives here, and every
 | one of them respects the same two hazards, which are properties of the
 | platform rather than of any one middleware:
 |
 |   • **A middleware has no recursion guard.** A `strapi.documents()` call
 |     inside one re-enters the whole chain from index zero — there is no depth
 |     counter and no re-entrancy flag anywhere in the 5.52.1 source. So a
 |     middleware reads with `strapi.db.query()`, which goes straight to the
 |     query engine, and writes to *other* rows the same way.
 |
 |   • **A middleware runs outside the write's transaction**, which opens inside
 |     `next()`. So it cannot undo a write by throwing after `next()` has
 |     returned. A middleware that means to refuse a write throws **before**
 |     calling `next()`; a middleware that means to react to one does its work
 |     after, knowing the write has already landed.
 |
 | Which half a middleware belongs to therefore follows from what it is for:
 |
 |   before `next()` — refusing a write, or amending the data being written;
 |   after  `next()` — reconciling other rows with the row that was just written.
 |
 | Registered in `register`, not `bootstrap`: the document service exists by
 | then and content is writable from `bootstrap` onwards, so a middleware
 | registered later would miss writes made by anything that boots before it.
 |
 */

import type { Core } from "@strapi/strapi"

import { assume_event_time } from "./assume-event-time"

import { demote_other_default_page_shells } from "./demote-other-default-page-shells"
import { demote_other_main_events } from "./demote-other-main-events"
import { default_session_event_to_main } from "./default-session-event-to-main"
import { derive_colour_triplets } from "./derive-colour-triplets"
import { derive_contributor_events } from "./derive-contributor-events"
import { derive_session_dates } from "./derive-session-dates"
import { fill_page_shell_from_default } from "./fill-page-shell-from-default"
import { reject_inverted_date_range } from "./reject-inverted-date-range"
import { reject_session_without_event } from "./reject-session-without-event"

export function register_document_middlewares ( strapi: Core.Strapi ) {
	// Order matters, and one rule settles it: **every refusal runs before every
	// amendment**, so a rejected save leaves no half-amended `params` behind
	// it. Both refusals therefore sit at the top.
	//
	// The one exception is the middleware that fills a session's event, which
	// has to run before the refusal that reads the attribute — otherwise every
	// session created without an event would be refused rather than given the
	// main one. It amends `params` and a refusal can still follow it, so the
	// rule above is stated as what it is: an ordering with one deliberate
	// inversion, rather than an absolute.
	strapi.documents.use( reject_inverted_date_range( strapi ) )
	strapi.documents.use( default_session_event_to_main( strapi ) )
	strapi.documents.use( reject_session_without_event( strapi ) )
	// Before the dates are derived from them: the derivation asks which day a
	// datetime falls on, and a datetime that has not said where it is has no
	// answer to that.
	strapi.documents.use( assume_event_time( strapi ) )
	strapi.documents.use( derive_colour_triplets( strapi ) )
	strapi.documents.use( derive_session_dates( strapi ) )
	strapi.documents.use( fill_page_shell_from_default( strapi ) )
	strapi.documents.use( demote_other_main_events( strapi ) )
	strapi.documents.use( demote_other_default_page_shells( strapi ) )
	// Reconciles Contributor.events after every session write. Runs last: it
	// reads the stored contributor list on both sides of `next()`, so anything
	// earlier that amends the write into place should have done so already.
	strapi.documents.use( derive_contributor_events( strapi ) )
}
