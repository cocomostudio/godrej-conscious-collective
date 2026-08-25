
import type { Core } from "@strapi/strapi"

import { configure_admin_metadata } from "./this/admin-metadata/configure-admin-metadata"
import { register_document_middlewares } from "./this/document-middlewares/index"
import { configure_admin_roles } from "./this/lead/configure-admin-roles"
import { prune_public_lead_permissions } from "./this/lead/prune-public-lead-permissions"

export default {
	/**
	 |
	 | Runs before the application is initialised, once the plugins are loaded.
	 |
	 */
	register ( { strapi }: { strapi: Core.Strapi } ) {
		// Here rather than in `bootstrap`: content is writable from `bootstrap`
		// onwards, so a middleware registered any later would miss writes made
		// by whatever boots before it.
		register_document_middlewares( strapi )
	},

	/**
	 |
	 | Runs once the application has started.
	 |
	 */
	async bootstrap ( { strapi }: { strapi: Core.Strapi } ) {
		await configure_admin_metadata( strapi )

		// Both of these **repair rather than refuse**, unlike the metadata
		// validation above. The difference is where the remedy lives: a
		// mistyped attribute name is fixed in a file in this repository, and a
		// permission or a role is fixed in the admin panel — which is part of
		// the application that would be refusing to start.
		await prune_public_lead_permissions( strapi )
		await configure_admin_roles( strapi )
	},
}
