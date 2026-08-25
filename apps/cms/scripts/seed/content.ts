
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
 | `contributors.ts`, `pages/`, `sessions.ts`, `leads.ts`. Beside them sit the
 | three files that write rows belonging to a plugin rather than to this
 | project's schemas: `url-patterns.ts`, `permissions.ts` and
 | `registration-relay-token.ts`.
 |
 | `lib/` holds what more than one of them needs: the catalogue of components
 | every region is written in, the listings, the pictures, the five sample
 | bodies a session is given, and the two uploads that cannot be bare urls.
 |
 | The order of the calls below is the only thing this file says, and it is
 | the one thing that cannot be read off any of the others.
 |
 */

import { write_contributors } from "./contributors.ts"
import { write_events } from "./events.ts"
import { write_leads } from "./leads.ts"
import { write_page_shells } from "./page-shells.ts"
import { write_pages } from "./pages/index.ts"
import { grant_public_permissions } from "./permissions.ts"
import { write_registration_relay_token } from "./registration-relay-token.ts"
import { write_sessions } from "./sessions.ts"
import { write_url_patterns } from "./url-patterns.ts"

import type { Strapi } from "./lib/strapi.ts"

/**
 |
 | What a caller may turn off.
 |
 | One thing so far, and it is the only part of this seed that leaves the
 | machine. See `upload_slideshow` for why those five pictures cannot be bare
 | addresses like every other picture here — and why the test harness, which
 | runs this once for the whole suite, says no to them.
 |
 */
export type Seed_Options = {
	/**
	 |
	 | Download and upload the registration form's slideshow. Default true.
	 |
	 | **The CMS test harness passes false**, from `global-setup.ts`. Not for
	 | the time — the harness seeds once per run, so it is five requests, not
	 | fifty-five — but because nothing in that suite looks at the slideshow,
	 | and a run that can fail when somebody else's image host is slow is a run
	 | whose red means two different things. The note on `upload_slideshow` is
	 | the standing rule: this is the only part of the seed that leaves the
	 | machine, and the tests do not get to depend on it.
	 |
	 | An option rather than the seed sniffing for `VITEST` in its environment:
	 | a caller stating what it wants is a thing you can read, and an
	 | environment variable read from inside is a thing you have to find.
	 |
	 */
	download_media?: boolean
}

export async function write_seed_content (
	strapi: Strapi,
	{ download_media = true }: Seed_Options = {},
) {
	await write_url_patterns( strapi )

	const events = await write_events( strapi )
	const page_shells = await write_page_shells( strapi, download_media )
	// **Contributors come before pages**, because a page can curate a listing
	// of them by hand and a curated relation needs something to point at. The
	// sessions still come last: they are what fills a contributor's `events`,
	// and a session's own page curates a list of its neighbours.
	const contributors = await write_contributors( strapi, page_shells )
	await write_pages( strapi, page_shells, events, contributors )
	await write_sessions( strapi, page_shells, events, contributors )
	await write_leads( strapi, events )

	await grant_public_permissions( strapi )
	await write_registration_relay_token( strapi )
}
