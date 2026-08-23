
/**
 |
 | Populate fragment for `media.instagram-feed-v1`.
 |
 | Identical to the vanilla carousel's. The two stay separate components anyway:
 | an enum collapsing them would have to name its options after the pages they
 | appear on, which is not a property of the content.
 |
 */

import { populate_image_link_v1 } from "../navigation/image-link-v1"

export const populate_instagram_feed_v1 = {
	slides: { populate: populate_image_link_v1 },
}
