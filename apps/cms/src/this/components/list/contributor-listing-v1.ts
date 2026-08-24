
/**
 |
 | Populate fragment for `list.contributor-listing-v1`.
 |
 | The relation is the curated half of this component: filled in, it is the
 | listing; left empty, the event supplies one. Either way only identity and
 | order are asked for here — see `curated-rows.ts`.
 |
 */

import { CURATED_ROWS } from "./curated-rows"

export const populate_contributor_listing_v1 = {
	contributors: CURATED_ROWS,
}
