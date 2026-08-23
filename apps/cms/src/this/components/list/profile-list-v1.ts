
/**
 |
 | Populate fragment for `list.profile-list-v1`.
 |
 | `profiles` is a repeatable component list rather than a region.
 |
 */

import { populate_profile_v1 } from "./profile-v1"

export const populate_profile_list_v1 = {
	profiles: { populate: populate_profile_v1 },
}
