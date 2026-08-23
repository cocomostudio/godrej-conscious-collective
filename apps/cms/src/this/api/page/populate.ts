
/**
 |
 | Populate fragment for `api::page.page`.
 |
 | The deepest legal path in the render tree runs entry region → section →
 | composite → leaf, and this object mirrors that graph by hand, with no
 | recursion. That is the reason depth is capped at three dynamic zones: a
 | component that could contain itself would make a finite populate object
 | impossible, and the symptom is not an error but content silently missing
 | below whatever depth the object reaches.
 |
 */

import { populate_section_v1 } from "../../components/container/section-v1"
import { populate_heading_v1 } from "../../components/text/heading-v1"
import { populate_plain_string_v1 } from "../../components/text/plain-string-v1"
import { populate_event } from "../event/populate"
import { populate_page_shell } from "../page-shell/populate"

export const populate_page = {
	event: { populate: populate_event },
	main_region: {
		on: {
			"container.section-v1": { populate: populate_section_v1 },
		},
	},
	page_shell: { populate: populate_page_shell },
	side_region: {
		on: {
			"text.heading-v1": { populate: populate_heading_v1 },
			"text.plain-string-v1": { populate: populate_plain_string_v1 },
		},
	},
}
