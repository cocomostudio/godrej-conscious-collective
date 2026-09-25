
import type { Core } from "@strapi/strapi"

import { describe_content_type } from "./describe"
import { read_settings } from "./settings"

export const controllers = {
	export: ( { strapi }: { strapi: Core.Strapi } ) => ( {
		async describe ( ctx: any ) {
			const { uid } = ctx.params
			const settings = read_settings( strapi )

			if ( !settings.content_types.includes( uid ) ) {
				return ctx.notFound(
					`The export-entries plugin is not set up for "${uid}".`,
				)
			}

			const checker = strapi.plugin( "content-manager" )
				.service( "permission-checker" )
				.create( { model: uid, userAbility: ctx.state.userAbility } )

			if ( checker.cannot.read() ) {
				return ctx.forbidden()
			}

			ctx.body = {
				data: await describe_content_type( strapi, uid, settings ),
			}
		},
	} ),
}
