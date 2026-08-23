
/**
 |
 | Populate fragment for `code.html-document-hooks-v1`.
 |
 | The one component in the catalogue with **more than one region**, which is
 | why the block declares its region names: the attribute-to-prop mapping is a
 | property of the block rather than of the schema, and each of these three
 | arrives at a different point of the HTML document.
 |
 | Its zones do not count against the render tree's depth cap. They hang off the
 | page shell rather than off an entry's main region, and their one member is a
 | leaf.
 |
 */

import { populate_script_v1 } from "./script-v1"

const SCRIPTS = {
	on: {
		"code.script-v1": { populate: populate_script_v1 },
	},
}

export const populate_html_document_hooks_v1 = {
	after_body_opening: SCRIPTS,
	before_body_closing: SCRIPTS,
	before_head_closing: SCRIPTS,
}
