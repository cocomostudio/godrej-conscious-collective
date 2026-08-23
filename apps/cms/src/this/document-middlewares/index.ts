
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

import { demote_other_default_page_shells } from "./demote-other-default-page-shells"
import { demote_other_main_events } from "./demote-other-main-events"
import { derive_colour_triplets } from "./derive-colour-triplets"
import { fill_page_shell_from_default } from "./fill-page-shell-from-default"
import { reject_inverted_date_range } from "./reject-inverted-date-range"

export function register_document_middlewares ( strapi: Core.Strapi ) {
	// Order matters in exactly one place: the date range is refused before
	// anything else touches the event's data, so a rejected save leaves no
	// half-amended `params` behind it.
	strapi.documents.use( reject_inverted_date_range( strapi ) )
	strapi.documents.use( derive_colour_triplets( strapi ) )
	strapi.documents.use( fill_page_shell_from_default( strapi ) )
	strapi.documents.use( demote_other_main_events( strapi ) )
	strapi.documents.use( demote_other_default_page_shells( strapi ) )
}
