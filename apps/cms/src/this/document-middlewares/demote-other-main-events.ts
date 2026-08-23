
/**
 |
 | Setting an event as main demotes whichever event was main before, so two
 | editions can never both claim to be the one the site is advertising.
 |
 | The site chrome reads the main event on every page, and it reads exactly one
 | of them. Two rows carrying `main` would make which festival the header
 | advertises a matter of row order.
 |
 */

import type { Core } from "@strapi/strapi"

import { exclusive_flag } from "./exclusive-flag"

export function demote_other_main_events ( strapi: Core.Strapi ) {
	return exclusive_flag( {
		flag: "main",
		strapi,
		uid: "api::event.event",
	} )
}
