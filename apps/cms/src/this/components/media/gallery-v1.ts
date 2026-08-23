
/**
 |
 | Populate fragment for `media.gallery-v1`.
 |
 | `images` is a **repeatable component list, not a region**: its members carry
 | no `__component`, so the renderer hands them to the block as raw data rather
 | than walking into them.
 |
 */

import { populate_image_v1 } from "./image-v1"

export const populate_gallery_v1 = {
	images: { populate: populate_image_v1 },
}
