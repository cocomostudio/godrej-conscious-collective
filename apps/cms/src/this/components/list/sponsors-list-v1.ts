
/**
 |
 | Populate fragment for `list.sponsors-list-v1`.
 |
 | `sponsors` is a repeatable component list rather than a region.
 |
 */

import { populate_sponsor_v1 } from "./sponsor-v1"

export const populate_sponsors_list_v1 = {
	sponsors: { populate: populate_sponsor_v1 },
}
