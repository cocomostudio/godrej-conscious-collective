
/**
 |
 | Populate fragment for `list.profile-v1`.
 |
 */

import { populate_image_v1 } from "../media/image-v1"

export const populate_profile_v1 = {
	image: { populate: populate_image_v1 },
}
