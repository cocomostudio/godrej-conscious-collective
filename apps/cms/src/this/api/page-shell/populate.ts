
/**
 |
 | Populate fragment for `api::page-shell.page-shell`.
 |
 | A page shell is never resolved from a path of its own. It is fetched as part
 | of an entry's envelope, through the entry's `page_shell` relation, and this
 | fragment is what that relation is populated with.
 |
 */

import { populate_html_document_hooks_v1 } from "../../components/code/html-document-hooks-v1"
import { populate_link_v1 } from "../../components/navigation/link-v1"

export const populate_page_shell = {
	arbitrary_code: { populate: populate_html_document_hooks_v1 },
	form_slideshow: true,
	navigation_footer: { populate: populate_link_v1 },
	navigation_header: { populate: populate_link_v1 },
}
