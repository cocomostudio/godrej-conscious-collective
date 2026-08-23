
import type { Core } from "@strapi/strapi"

import { configure_admin_metadata } from "./this/admin-metadata/configure-admin-metadata"

export default {
	/**
	 |
	 | Runs before the application is initialised, once the plugins are loaded.
	 |
	 */
	register ( _context: { strapi: Core.Strapi } ) {},

	/**
	 |
	 | Runs once the application has started.
	 |
	 */
	async bootstrap ( { strapi }: { strapi: Core.Strapi } ) {
		await configure_admin_metadata( strapi )
	},
}
