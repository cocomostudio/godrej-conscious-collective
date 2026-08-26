
/**
 |
 | Populate fragment for `list.archive-carousel-listing-v1`.
 |
 | Identical to the carousel's and the Instagram feed's, because all three hold
 | the same attribute and differ only in how they draw it.
 |
 */

import { populate_image_link_v1 } from "../navigation/image-link-v1"

export const populate_archive_carousel_listing_v1 = {
	slides: { populate: populate_image_link_v1 },
}
