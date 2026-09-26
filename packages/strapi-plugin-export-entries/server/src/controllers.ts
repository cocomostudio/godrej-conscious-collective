
import type { Core } from "@strapi/strapi"

import { describe_content_type } from "./describe"
import { check_request, type Selection } from "./request"
import { count_rows, csv_stream } from "./rows"
import { PLUGIN_ID, read_settings, type Settings } from "./settings"
import type { Tickets } from "./tickets"

const INVALID_LINK = "The download link is not valid."

export const controllers = {
	export: ( { strapi }: { strapi: Core.Strapi } ) => ( {
		async describe ( ctx: any ) {
			const { uid } = ctx.params
			const settings = read_settings( strapi )

			if ( !can_export( ctx, strapi, uid, settings ) ) {
				return
			}

			ctx.body = {
				data: await describe_content_type( strapi, uid, settings ),
			}
		},

		/**
		 |
		 | Checks an export and counts its rows. Issues a ticket for the
		 | download only when at least one row matches.
		 |
		 */
		async request_ticket ( ctx: any ) {
			const body = ctx.request.body
			const settings = read_settings( strapi )

			if ( !can_export( ctx, strapi, body?.uid, settings ) ) {
				return
			}

			if ( tickets_of( strapi ).is_running( ctx.state.user.id ) ) {
				ctx.body = { data: { outcome: "export_running" } }
				return
			}

			const { fields } = await describe_content_type(
				strapi,
				body.uid,
				settings,
			)
			const request = check_request(
				strapi,
				body,
				fields,
				settings,
				new Date(),
			)
			const count = await count_rows( strapi, request, settings.timezone )

			if ( count === 0 ) {
				ctx.body = { data: { outcome: "no_entries" } }
				return
			}

			const ticket = tickets_of( strapi ).issue( {
				admin: { email: ctx.state.user.email, id: ctx.state.user.id },
				count,
				issued_at: Date.now(),
				request,
			} )

			ctx.body = {
				data: {
					count,
					file_name: request.file_name,
					outcome: "ticket",
					ticket,
				},
			}
		},

		/**
		 |
		 | Streams the CSV for a ticket. The ticket is the only credential,
		 | because a plain download link cannot carry the admin's login header.
		 |
		 */
		async download ( ctx: any ) {
			const redeemed = tickets_of( strapi ).redeem(
				String( ctx.query.ticket ?? "" ),
			)

			if ( !redeemed ) {
				return ctx.unauthorized( INVALID_LINK )
			}

			const { admin, count, request } = redeemed

			if ( !await can_still_export( ctx, strapi, admin.id, request.uid ) ) {
				return
			}

			if ( tickets_of( strapi ).is_running( admin.id ) ) {
				return ctx.throw( 409, "An export is already running." )
			}

			const { timezone } = read_settings( strapi )

			strapi.log.info(
				`[${PLUGIN_ID}] Admin ${admin.id} (${admin.email}) exported `
					+ `${count} rows of ${request.uid}. Selection: `
					+ `${describe_selection( request.selection )}. Fields: `
					+ `${request.fields.map( ( field ) => field.name ).join( ", " )}.`,
			)

			ctx.set( {
				"Cache-Control": "no-store",
				"Content-Disposition":
					`attachment; filename="${request.file_name}"`,
				"X-Accel-Buffering": "no",
				"X-Content-Type-Options": "nosniff",
			} )
			ctx.type = "text/csv; charset=utf-8"

			const stream = csv_stream( strapi, request, timezone )
			tickets_of( strapi ).run( admin.id, stream )

			// Koa leaves the response open when its body fails after the
			// headers have gone out. Cutting the connection before the last
			// chunk is what makes the browser mark the download as failed.
			stream.once( "error", () => ctx.res.destroy() )

			ctx.body = stream
		},
	} ),
}

/**
 |
 | Whether the admin may export the content-type. Answers the refusal itself
 | when not: a 404 for a content-type the plugin is not set up for, and a 403
 | for an admin who cannot read it.
 |
 */
function can_export (
	ctx: any,
	strapi: Core.Strapi,
	uid: unknown,
	settings: Settings,
) {
	if ( !settings.content_types.includes( uid as string ) ) {
		ctx.notFound( `The export-entries plugin is not set up for "${uid}".` )
		return false
	}

	const checker = checker_of( strapi, uid as string, ctx.state.userAbility )

	if ( checker.cannot.read() ) {
		ctx.forbidden()
		return false
	}

	return true
}

/**
 |
 | Whether the admin behind a ticket may still export the content-type. Access
 | can be lost between asking for a ticket and using it. Answers the refusal
 | itself when not: a 401 for an admin who has been deleted or blocked, and a
 | 403 for an admin who can no longer read the content-type.
 |
 */
async function can_still_export (
	ctx: any,
	strapi: Core.Strapi,
	admin_id: number,
	uid: string,
) {
	const user = await strapi.db.query( "admin::user" ).findOne( {
		populate: [ "roles" ],
		where: { id: admin_id },
	} )

	if ( !user || user.isActive !== true || user.blocked === true ) {
		ctx.unauthorized( INVALID_LINK )
		return false
	}

	const ability = await strapi.service( "admin::permission" )
		.engine.generateUserAbility( user )

	if ( checker_of( strapi, uid, ability ).cannot.read() ) {
		ctx.forbidden()
		return false
	}

	return true
}

/** The content manager's permission checker for one admin's ability. */
function checker_of ( strapi: Core.Strapi, uid: string, ability: unknown ) {
	return strapi.plugin( "content-manager" )
		.service( "permission-checker" )
		.create( { model: uid, userAbility: ability } )
}

function tickets_of ( strapi: Core.Strapi ): Tickets {
	return strapi.plugin( PLUGIN_ID ).service( "tickets" )
}

function describe_selection ( selection: Selection ) {
	switch ( selection.kind ) {
		case "latest":
			return `latest ${selection.count}`
		case "period":
			return `${selection.period}, ${selection.days.start} to ${
				selection.days.end
			}`
		case "range":
			return `${selection.days.start} to ${selection.days.end}`
	}
}
