
/**
 |
 | The sample content, written against a booted Strapi.
 |
 | Two rules govern how it is written, both from the spec:
 |
 |   • **The webtools pattern rows go in directly, before any content.** They
 |     live in the database rather than in a file, so a fresh clone has none
 |     until something creates them, and every alias generated afterwards
 |     depends on them being there first.
 |
 |   • **Everything else goes through the document service.** That is what makes
 |     webtools' own middleware generate the aliases and their join rows. Writing
 |     aliases by hand would mean building the alias row *and* its link rows for
 |     both the draft and published rows sharing a document id, with a valid
 |     locale, and it would bypass the path-uniqueness middleware entirely — a
 |     copy of plugin logic that the plugin is free to change.
 |
 | This module is imported by the seed script and by the CMS test harness, which
 | is why it takes a `strapi` and neither boots nor destroys one.
 |
 | ─── WHERE THINGS ARE ───────────────────────────────────────────────────────
 |
 | One file per content type, named after it — `events.ts`, `page-shells.ts`,
 | `contributors.ts`, `pages/`, `sessions.ts`. Beside them sit the two files
 | that write rows belonging to a plugin rather than to this project's
 | schemas: `url-patterns.ts` and `permissions.ts`.
 |
 | `lib/` holds what more than one of them needs: the catalogue of components
 | every region is written in, the listings, the pictures, the five sample
 | bodies a session is given, and the one upload that cannot be a bare url.
 |
 | The order of the calls below is the only thing this file says, and it is
 | the one thing that cannot be read off any of the others.
 |
 */

import { write_contributors } from "./contributors.ts"
import { write_events } from "./events.ts"
import { write_page_shells } from "./page-shells.ts"
import { write_pages } from "./pages/index.ts"
import { grant_public_permissions } from "./permissions.ts"
import { write_sessions } from "./sessions.ts"
import { write_url_patterns } from "./url-patterns.ts"

import type { Strapi } from "./lib/strapi.ts"

export async function write_seed_content ( strapi: Strapi ) {
	await write_url_patterns( strapi )

	const events = await write_events( strapi )
	const page_shells = await write_page_shells( strapi )
	// **Contributors come before pages**, because a page can curate a listing
	// of them by hand and a curated relation needs something to point at. The
	// sessions still come last: they are what fills a contributor's `events`,
	// and a session's own page curates a list of its neighbours.
	const contributors = await write_contributors( strapi, page_shells )
	await write_pages( strapi, page_shells, events, contributors )
	await write_sessions( strapi, page_shells, events, contributors )

	await grant_public_permissions( strapi )
}
