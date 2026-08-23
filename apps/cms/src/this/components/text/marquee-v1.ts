
/**
 |
 | Populate fragment for `text.marquee-v1`.
 |
 | `items` is a **repeatable component list, not a region.** It reuses the plain
 | string component because that is exactly what each item is, and because
 | Strapi has no repeatable scalar. Its members carry no `__component`, so the
 | renderer leaves them as raw data for the block.
 |
 */

import { populate_plain_string_v1 } from "./plain-string-v1"

export const populate_marquee_v1 = {
	items: { populate: populate_plain_string_v1 },
}
