
/**
 |
 | Two custom admin roles, so that reading a registrant's name, email address
 | and phone number is a deliberate grant rather than something everybody has.
 |
 | Strapi's stock Editor and Author roles can read every content type there is,
 | Lead included. Nobody chose that; it is simply what "an editor edits content"
 | comes out as when Lead is one of the content types. So:
 |
 |   **Content**  everything the stock Editor can do, with Lead cut out of it
 |                entirely — not read-only, absent. This is the role content
 |                work gets.
 |   **Leads**    read on Lead and on nothing else. The role somebody gets
 |                BECAUSE they need the Leads, rather than Lead riding along
 |                inside a role they were given for another reason.
 |
 | Super Admin still reads everything, which is the third population and the one
 | that cannot be narrowed.
 |
 | ─── WHAT THIS DOES NOT DO ──────────────────────────────────────────────────
 |
 | **It creates each role once and never touches it again.** A role that already
 | exists is left exactly as an operator left it, including its permissions. The
 | cost is real and is worth stating: a content type added after these roles
 | were first created is not granted to Content automatically, and somebody has
 | to tick it in the admin. That is the better failure. The alternative —
 | reasserting the permission set on every boot — would silently undo any
 | narrowing an operator had done deliberately, and they would find out by
 | discovering somebody could reach something again.
 |
 | **It never refuses the boot.** Same principle as the permission repair beside
 | it: the remedy for a role that could not be created lives in the admin panel,
 | and the admin panel is inside the application that would be refusing to
 | start. Anything that goes wrong here is logged and the boot continues.
 |
 */

import type { Core } from "@strapi/strapi"

const LEAD_UID = "api::lead.lead"

const CONTENT_ROLE = {
	code: "gcc-content",
	name: "Content",
	description: "Content work: everything an editor does, with Leads excluded "
		+ "entirely.",
}

const LEADS_ROLE = {
	code: "gcc-leads",
	name: "Leads",
	description: "Reads Leads, and nothing else. Granted deliberately, to "
		+ "whoever genuinely needs them.",
}

const READ_ACTION = "plugin::content-manager.explorer.read"

export async function configure_admin_roles ( strapi: Core.Strapi ) {
	/*
	 | An application with no Lead content type has no Leads to exclude a role
	 | from, and one with no admin role table has nowhere to put a role. Both
	 | describe the throwaway application `boot_fixture_cms` builds to observe
	 | boot-time behaviour, and neither is worth an error line in that run — the
	 | catch below would otherwise log one on every fixture test, which trains
	 | a reader to ignore the message that matters.
	 */
	if (
		!strapi.db.metadata.has( "admin::role" )
		|| !strapi.contentType( LEAD_UID as any )
	) {
		return
	}

	try {
		await ensure_content_role( strapi )
		await ensure_leads_role( strapi )
	} catch ( error ) {
		strapi.log.error(
			`[lead] The custom admin roles could not be configured: `
				+ `${
					error instanceof Error
						? error.message
						: String( error )
				}. `
				+ `The boot continues — until they exist, content work has to be `
				+ `done under a role that can also read Leads.`,
		)
	}
}

/**
 |
 | Everything the stock Editor role holds, minus every action whose subject is
 | Lead.
 |
 | The permission set is built from the action registry rather than written out,
 | because the registry is what the admin's own permission grid is built from —
 | a hand-written list would be a second copy of it, going stale one content
 | type at a time.
 |
 */
async function ensure_content_role ( strapi: Core.Strapi ) {
	const role = await create_unless_present( strapi, CONTENT_ROLE )

	if ( !role ) {
		return
	}

	const permission_service = strapi.service( "admin::permission" ) as any
	const content_type_service = strapi.service( "admin::content-type" ) as any

	const actions = permission_service.actionProvider.values()
		.filter( ( action: any ) => action.section === "contentTypes" )

	// `restrictedSubjects` is Strapi's own name for "leave these out", and it
	// is what the stock roles are seeded through — so Lead is excluded by the
	// same mechanism that decides which fields every other subject gets,
	// rather than by a filter of ours running afterwards.
	const permissions = content_type_service.getPermissionsWithNestedFields(
		actions,
		{ restrictedSubjects: [ LEAD_UID ] },
	)

	await strapi.service( "admin::role" ).assignPermissions(
		role.id,
		permissions,
	)

	strapi.log.info(
		`[lead] Created the "${CONTENT_ROLE.name}" admin role. It excludes `
			+ `Leads entirely.`,
	)
}

/**
 |
 | Read on Lead, and nothing else — no create, no update, no delete. A Lead is
 | a record of something somebody said, and editing one is not a thing anybody
 | should be doing through the admin.
 |
 */
async function ensure_leads_role ( strapi: Core.Strapi ) {
	const role = await create_unless_present( strapi, LEADS_ROLE )

	if ( !role ) {
		return
	}

	const content_type_service = strapi.service( "admin::content-type" ) as any

	const permissions = content_type_service.getPermissionsWithNestedFields( [
		{ actionId: READ_ACTION, subjects: [ LEAD_UID ] },
	] )

	await strapi.service( "admin::role" ).assignPermissions(
		role.id,
		permissions,
	)

	strapi.log.info(
		`[lead] Created the "${LEADS_ROLE.name}" admin role. It reads `
			+ `Leads and nothing else.`,
	)
}

/**
 |
 | Creates the role, or hands back nothing when one with that code is already
 | there. Nothing is what tells the caller to leave well alone.
 |
 */
async function create_unless_present (
	strapi: Core.Strapi,
	{ code, description, name }: {
		code: string
		description: string
		name: string
	},
) {
	const role_service = strapi.service( "admin::role" ) as any

	const existing = await role_service.findOne( { code } )

	if ( existing ) {
		return null
	}

	return await role_service.create( { code, description, name } )
}
