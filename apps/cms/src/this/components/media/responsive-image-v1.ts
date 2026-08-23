
/**
 |
 | Populate fragment for `media.responsive-image-v1`.
 |
 | Three images, one per width. This is art direction rather than resolution —
 | the upload's own breakpoints already hand the browser a `srcset` within each
 | one, and the two are complementary.
 |
 */

import { populate_image_v1 } from "./image-v1"

export const populate_responsive_image_v1 = {
	large: { populate: populate_image_v1 },
	medium: { populate: populate_image_v1 },
	small: { populate: populate_image_v1 },
}
