
/**
 |
 | Populate fragment for `media.vanilla-carousel-v1`.
 |
 | Identical to the Instagram feed's, because the two components hold the same
 | attributes and differ only in how they render.
 |
 */

import { populate_image_link_v1 } from "../navigation/image-link-v1"

export const populate_vanilla_carousel_v1 = {
	slides: { populate: populate_image_link_v1 },
}
