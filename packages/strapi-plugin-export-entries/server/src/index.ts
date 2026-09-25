
import type { Core } from "@strapi/strapi"

import { controllers } from "./controllers"
import { routes } from "./routes"
import { config, read_settings } from "./settings"
import { tickets } from "./tickets"

export default {
	config,
	controllers,
	routes,
	services: { tickets },

	/** Refuses the boot when a setting is wrong. */
	register ( { strapi }: { strapi: Core.Strapi } ) {
		read_settings( strapi )
	},
}
