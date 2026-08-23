
import type { Core } from "@strapi/strapi"

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
	bootstrap ( _context: { strapi: Core.Strapi } ) {},
}
