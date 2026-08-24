
/**
 |
 | Populate fragment for `api::contributor.contributor`.
 |
 | A contributor's page has no region — its main column is a single implicit
 | ContributorProfile block that the website assembles from `name`, `role`,
 | `image` and `blurb`. Only the image needs populating, because it is a
 | component; the other three are columns on the row already.
 |
 | The `events` relation is not reached here. It is the contributor listing's
 | filter, not something the contributor's own page renders — and pulling
 | events into every contributor envelope would carry the whole colour and
 | date payload back for no reader.
 |
 */

import { populate_image_v1 } from "../../components/media/image-v1"
import { populate_page_shell } from "../page-shell/populate"

export const populate_contributor = {
	image: { populate: populate_image_v1 },
	page_shell: { populate: populate_page_shell },
}
