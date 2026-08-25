
/**
 |
 | The third layer of Lead protection: a boot check that **repairs rather than
 | refuses**.
 |
 | Lead's router declares create and nothing else, so no read action exists and
 | no checkbox for one appears. That closes the door going forward. It does not
 | clean up behind itself: the users-permissions plugin prunes stored
 | permissions against the **controller's keys** rather than against the routes,
 | and `api::lead.lead.find` is a controller key whether or not a route composes
 | onto it — so a row stored before this route set existed survives every boot,
 | and the role service re-injects it. The Public role's edit page then renders
 | that checkbox **ticked**. It does nothing, because there is no route to
 | reach, but it reads as a breach, and an operator who has to be told "that
 | one is fine, ignore it" has been handed a control they can no longer trust.
 |
 | So the row is deleted, and the deletion is logged loudly. Loudly on purpose:
 | if this ever fires on a running site, somebody granted something, and the
 | log line is the only trace of it.
 |
 | **It repairs, and does not refuse.** A boot-time refusal was considered and
 | rejected: the remedy lives in the admin panel, and the admin panel is part of
 | the application that would be refusing to start — a deadlock escapable only
 | by hand-editing permission rows or by adding a skip flag, which is a security
 | control that switches itself off. The general principle, of which this is the
 | first instance: **never make a check refuse to boot when its remedy lives
 | inside the application being refused.** The admin metadata validation is the
 | deliberate exception, because its remedy is a file in the repository.
 |
 */

import type { Core } from "@strapi/strapi"

const ROLE_UID = "plugin::users-permissions.role"
const PERMISSION_UID = "plugin::users-permissions.permission"

const LEAD_ACTION_PREFIX = "api::lead.lead."

/**
 |
 | The one action a Public-role row may legitimately name. Everything else is
 | swept, including actions this application does not define — a permission row
 | naming `api::lead.lead.findOne` is exactly as wrong whether the controller
 | still has that key or not.
 |
 */
const PERMITTED = `${LEAD_ACTION_PREFIX}create`

export async function prune_public_lead_permissions ( strapi: Core.Strapi ) {
	/*
	 | **A Strapi without the users-permissions plugin has no such table**, and
	 | `strapi.db.query` on a model it does not know THROWS rather than
	 | answering nothing. A throw here is a refused boot, which is precisely
	 | what this check exists not to be — so the question is asked of the
	 | metadata registry first.
	 |
	 | Not a hypothetical: `boot_fixture_cms` builds a throwaway application
	 | with no dependencies at all, to observe boot-time behaviour that cannot
	 | be seen over HTTP. Without this guard every one of those tests dies in
	 | `bootstrap`, and the failure reads as a bug in the harness.
	 |
	 | Nothing is logged. An application with no public role has no public
	 | permissions to sweep, and saying so on every boot of a fixture is noise.
	 */
	if ( !strapi.db.metadata.has( ROLE_UID ) ) {
		return
	}

	const role = await strapi.db.query( ROLE_UID ).findOne( {
		select: [ "id" ],
		where: { type: "public" },
	} )

	if ( !role ) {
		// A database that has not finished its first boot. Nothing is stored
		// yet, so there is nothing to sweep, and saying so would be noise on
		// every fresh clone.
		return
	}

	const stored = await strapi.db.query( PERMISSION_UID ).findMany( {
		select: [ "id", "action" ],
		where: { role: role.id },
	} ) as { id: number; action: string }[]

	const stray = stored.filter( ( permission ) =>
		permission.action.startsWith( LEAD_ACTION_PREFIX )
		&& permission.action !== PERMITTED
	)

	if ( stray.length === 0 ) {
		return
	}

	for ( const permission of stray ) {
		await strapi.db.query( PERMISSION_UID ).delete( {
			where: { id: permission.id },
		} )
	}

	strapi.log.warn(
		`[lead] Deleted ${stray.length} stored Public-role Lead permission`
			+ `${stray.length === 1 ? "" : "s"}: `
			+ `${
				stray.map( ( permission ) => permission.action ).join( ", " )
			}. `
			+ `Lead registers no read route, so these could never be reached — `
			+ `but they render ticked in the Public role's edit page and read as `
			+ `a breach. Somebody granted them; find out who.`,
	)
}
