
import type { Core } from "@strapi/strapi"

import { controllers } from "./controllers"
import { routes } from "./routes"
import { config, read_settings } from "./settings"

export default {
	config,
	controllers,
	routes,

	/** Refuses the boot when a setting is wrong. */
	register ( { strapi }: { strapi: Core.Strapi } ) {
		read_settings( strapi )
	},
}
