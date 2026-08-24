
/**
 |
 | Populate fragment for `api::session.session`.
 |
 | The same graph a Page's fragment mirrors, plus the attributes a session's
 | own page is built from. The Masthead has no component behind it — it is the
 | website's, built from `name`, `standfirst` and `cover` — so the cover is
 | reached here rather than through a zone.
 |
 | `instances` and `venue` are components rather than zone entries: a
 | repeatable component list is never a region and arrives as raw data, and the
 | venue is one link. Both still need naming, because a component attribute
 | left out of a populate object arrives as nothing at all.
 |
 */

import { populate_section_v1 } from "../../components/container/section-v1"
import { populate_responsive_image_v1 } from "../../components/media/responsive-image-v1"
import { populate_link_v1 } from "../../components/navigation/link-v1"
import { populate_session_instance_v1 } from "../../components/session/session-instance-v1"
import { populate_event } from "../event/populate"
import { populate_page_shell } from "../page-shell/populate"

export const populate_session = {
	cover: { populate: populate_responsive_image_v1 },
	event: { populate: populate_event },
	instances: { populate: populate_session_instance_v1 },
	main_region: {
		on: {
			"container.section-v1": { populate: populate_section_v1 },
		},
	},
	page_shell: { populate: populate_page_shell },
	venue: { populate: populate_link_v1 },
}
