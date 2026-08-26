
/**
 |
 | Populate fragment for `list.archive-timeline-listing-v1`.
 |
 | Its entries are a repeatable component rather than a region, so they arrive
 | as raw data and the block that draws the timeline does what it likes with
 | them. What sits *inside* each entry is a region, and that is the archive
 | entry list — see the fragment it comes from.
 |
 */

import { populate_archive_entry_v1 } from "./archive-entry-v1"

export const populate_archive_timeline_listing_v1 = {
	entries: { populate: populate_archive_entry_v1 },
}
