import type { StrapiApp } from "@strapi/strapi/admin"

import { Export_Button } from "./export-button"

const PLUGIN_ID = "export-entries"

export default {
	register ( app: StrapiApp ) {
		app.registerPlugin( { id: PLUGIN_ID, name: PLUGIN_ID } )
	},

	bootstrap ( app: StrapiApp ) {
		app.getPlugin( "content-manager" ).injectComponent(
			"listView",
			"actions",
			{ Component: Export_Button, name: `${PLUGIN_ID}-button` },
		)
	},
}
