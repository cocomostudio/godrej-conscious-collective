
/**
 |
 | Setting a page shell as the default demotes whichever one was default before.
 |
 | Exactly the same invariant as an event's `main`, for the same reason: an
 | entry with no page shell of its own adopts the default, and "the default"
 | has to name one row.
 |
 */

import type { Core } from "@strapi/strapi"

import { exclusive_flag } from "./exclusive-flag"

export function demote_other_default_page_shells ( strapi: Core.Strapi ) {
	return exclusive_flag( {
		flag: "default",
		strapi,
		uid: "api::page-shell.page-shell",
	} )
}
