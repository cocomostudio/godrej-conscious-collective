
/**
 |
 | Populate fragment for `media.google-map-v1`.
 |
 | The image is what decides whether this component makes a third-party request
 | at all, so it has to arrive — a map whose picture went missing from the
 | populate object would embed Google's iframe on a page the editor had
 | deliberately kept free of it.
 |
 */

import { populate_responsive_image_v1 } from "./responsive-image-v1"

export const populate_google_map_v1 = {
	image: { populate: populate_responsive_image_v1 },
}
