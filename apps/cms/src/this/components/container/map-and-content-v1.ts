
/**
 |
 | Populate fragment for `container.map-and-content-v1`.
 |
 */

import { INNER_LIST } from "../inner-list"
import { populate_google_map_v1 } from "../media/google-map-v1"

export const populate_map_and_content_v1 = {
	content: { on: INNER_LIST },
	map: { populate: populate_google_map_v1 },
}
