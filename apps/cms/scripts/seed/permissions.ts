
/**
 |
 | What the website is allowed to ask for without a token.
 |
 | Not content: the users-permissions plugin keeps its grid in its own table,
 | and a fresh database has nothing granted at all. The website reads the CMS
 | as the Public role, so until these rows exist its very first request answers
 | 403 — which reads as a bug in the envelope route rather than as an empty
 | permissions grid.
 |
 */

import type { Strapi } from "./lib/strapi.ts"

/**
 |
 | The Public role's permissions.
 |
 | Not content, and not written through the document service — the
 | users-permissions plugin keeps its grid in its own table. A fresh database
 | has nothing granted, so without this the website's very first request answers
 | 403 and reads as a bug in the envelope route.
 |
 | `page.find` is what the envelope route checks before it looks a path up.
 | `envelope.find` is the route's own permission.
 |
 */
export async function grant_public_permissions ( strapi: Strapi ) {
	const actions = [
		"api::contributor.contributor.find",
		"api::envelope.envelope.find",
		"api::page.page.find",
		"api::session.session.find",
	]

	const role = await strapi.db
		.query( "plugin::users-permissions.role" )
		.findOne( { where: { type: "public" } } )

	if ( !role ) {
		throw new Error(
			`The Public role is missing, so no permission could be granted. `
				+ `Strapi creates it at bootstrap, so the seed has run against a `
				+ `Strapi that did not finish booting.`,
		)
	}

	for ( const action of actions ) {
		const existing = await strapi.db
			.query( "plugin::users-permissions.permission" )
			.findOne( { where: { action, role: role.id } } )

		if ( existing ) {
			continue
		}

		await strapi.db
			.query( "plugin::users-permissions.permission" )
			.create( { data: { action, role: role.id } } )
	}
}
