
/**
 |
 | Populate fragment for `list.session-list-v1`.
 |
 | A curated list, so only the identity and the order of what an editor dragged
 | in are asked for here — see `curated-rows.ts` for why the rows themselves
 | come later.
 |
 */

import { CURATED_ROWS } from "./curated-rows"

export const populate_session_list_v1 = {
	sessions: CURATED_ROWS,
}
