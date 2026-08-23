
/**
 |
 | Populate fragment for `api::page-shell.page-shell`.
 |
 | A page shell is never resolved from a path of its own. It is fetched as part
 | of an entry's envelope, through the entry's `page_shell` relation, and this
 | fragment is what that relation is populated with.
 |
 */

import { populate_link_v1 } from "../../components/navigation/link-v1"

export const populate_page_shell = {
	form_slideshow: true,
	navigation_footer: { populate: populate_link_v1 },
	navigation_header: { populate: populate_link_v1 },
}
