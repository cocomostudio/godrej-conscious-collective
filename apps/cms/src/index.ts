
import type { Core } from "@strapi/strapi"

import { configure_admin_metadata } from "./this/admin-metadata/configure-admin-metadata"
import { register_document_middlewares } from "./this/document-middlewares/index"

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
	},
}
