
import type { Core } from "@strapi/strapi"

import { describe_content_type } from "./describe"
import { type Access, access_of } from "./permissions"
import {
	check_request,
	type Export_Request,
	type Selection,
} from "./request"
import { count_rows, csv_stream } from "./rows"
import { PLUGIN_ID, read_settings, type Settings } from "./settings"
import type { Tickets } from "./tickets"

const INVALID_LINK = "The download link is not valid."

export const controllers = {
	export: ( { strapi }: { strapi: Core.Strapi } ) => ( {
		async describe ( ctx: any ) {
			const { uid } = ctx.params
			const settings = read_settings( strapi )
			const access = export_access( ctx, strapi, uid, settings )

			if ( !access ) {
				return
			}

			ctx.body = {
				data: await describe_content_type(
					strapi,
					uid,
					settings,
					access,
				),
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
			const access = export_access( ctx, strapi, body?.uid, settings )

			if ( !access ) {
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
				access,
			)
			const request = check_request(
				strapi,
				body,
				fields,
				settings,
				new Date(),
			)
			const count = await count_rows(
				strapi,
				request,
				settings.timezone,
				access,
			)

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

			const access = await ticket_access( ctx, strapi, admin.id, request )

			if ( !access ) {
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

			const stream = csv_stream( strapi, request, timezone, access )
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
 | The logged-in admin's access, when the admin may export the content-type.
 |
 | Answers the refusal itself, and no access, when not: a 404 for a
 | content-type the plugin is not set up for, and a 403 for an admin who cannot
 | read it.
 |
 */
function export_access (
	ctx: any,
	strapi: Core.Strapi,
	uid: unknown,
	settings: Settings,
): Access | undefined {
	if ( !settings.content_types.includes( uid as string ) ) {
		ctx.notFound( `The export-entries plugin is not set up for "${uid}".` )
		return undefined
	}

	const access = access_of( strapi, ctx.state.user, ctx.state.userAbility )

	if ( !access.can_read( uid as string ) ) {
		ctx.forbidden()
		return undefined
	}

	return access
}

/**
 |
 | The access of the admin behind a ticket, read from the admin's current
 | roles. Access can be lost or narrowed between asking for a ticket and
 | using it.
 |
 | Answers the refusal itself, and no access, when the admin may no longer
 | export: a 401 for an admin who has been deleted or blocked, and a 403 for
 | an admin who can no longer read the content-type or a chosen field.
 |
 */
async function ticket_access (
	ctx: any,
	strapi: Core.Strapi,
	admin_id: number,
	request: Export_Request,
): Promise<Access | undefined> {
	const user = await strapi.db.query( "admin::user" ).findOne( {
		populate: [ "roles" ],
		where: { id: admin_id },
	} )

	if ( !user || user.isActive !== true || user.blocked === true ) {
		ctx.unauthorized( INVALID_LINK )
		return undefined
	}

	const ability = await strapi.service( "admin::permission" )
		.engine.generateUserAbility( user )
	const access = access_of( strapi, user, ability )
	const hidden = request.fields.some( ( { name } ) =>
		!access.can_read_field( request.uid, name )
	)

	if ( !access.can_read( request.uid ) || hidden ) {
		ctx.forbidden()
		return undefined
	}

	return access
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
