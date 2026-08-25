
/**
 |
 | The webtools pattern rows, and the first thing the seed writes.
 |
 | Webtools derives a URL alias for every routable entry from a pattern held
 | per content type, and it holds those patterns **in the database** rather
 | than in a file. A fresh clone therefore has none until something creates
 | them, and every alias generated afterwards depends on them being there
 | first — which is why this runs before any content at all.
 |
 | These three rows are what makes a page answer at a path. Without them the
 | website's envelope route resolves nothing, and every request answers 404 on
 | a database that is otherwise full.
 |
 */

import type { Strapi } from "./lib/strapi.ts"

/**
 |
 | One pattern row per routable content type, written with a direct query.
 |
 | `/[title]` interpolates the Page's own title. No content type carries a slug
 | attribute — a Link field holding entry references rather than URL strings is
 | what will keep internal links from drifting, and it is planned rather than
 | built.
 |
 | A Page titled "Home" therefore resolves to `/home`, not to `/`. A pattern of
 | `/` would be legal but identical for every Page, and the alias path column has
 | no unique constraint, so the second Page would silently become `/-0`. The
 | website tries the incoming path as it arrives and falls back to `/home` only
 | when `/` resolves to nothing.
 |
 | `languages: []` matches what the admin's own pattern screen sends for a
 | content type that is not localised.
 |
 */
export async function write_url_patterns ( strapi: Strapi ) {
	await strapi.db.query( "plugin::webtools.url-pattern" ).create( {
		data: {
			contenttype: "api::page.page",
			languages: [],
			pattern: "/[title]",
		},
	} )

	await strapi.db.query( "plugin::webtools.url-pattern" ).create( {
		data: {
			contenttype: "api::session.session",
			languages: [],
			pattern: "/sessions/[name]",
		},
	} )

	await strapi.db.query( "plugin::webtools.url-pattern" ).create( {
		data: {
			contenttype: "api::contributor.contributor",
			languages: [],
			pattern: "/collaborators/[name]",
		},
	} )
}
