
/**
 |
 | Populate fragment for `container.image-and-content-v1`.
 |
 | A **composite**: it carries a region of its own, and that region is the inner
 | list rather than the section list. Pointing it at the section list instead
 | would permit a schedule listing inside an image, and would make the depth cap
 | unenforceable.
 |
 */

import { INNER_LIST } from "../inner-list"
import { populate_image_v1 } from "../media/image-v1"

export const populate_image_and_content_v1 = {
	content: { on: INNER_LIST },
	image: { populate: populate_image_v1 },
}
