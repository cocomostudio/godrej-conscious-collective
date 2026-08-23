
/**
 |
 | Populate fragment for `container.image-stack-and-content-v1`.
 |
 | `images` is a repeatable component list — three of them, held to exactly
 | three by the schema — and arrives as raw data. `content` is the region, and
 | it is the inner list.
 |
 */

import { INNER_LIST } from "../inner-list"
import { populate_responsive_image_v1 } from "../media/responsive-image-v1"

export const populate_image_stack_and_content_v1 = {
	content: { on: INNER_LIST },
	images: { populate: populate_responsive_image_v1 },
}
