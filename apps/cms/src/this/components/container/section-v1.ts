
/**
 |
 | Populate fragment for `container.section-v1`.
 |
 | A section's `content` is the **section list** — every leaf and every
 | composite. Every component the schema admits needs a branch here by name: a
 | component missing from this map arrives with no attributes at all, and the
 | page renders it as nothing rather than failing. That silence is the failure
 | this whole arrangement exists to prevent, so the list below and the `content`
 | zone in `src/components/container/section-v1.json` are two halves of one
 | thing and change together.
 |
 */

import { populate_image_and_content_v1 } from "./image-and-content-v1"
import { populate_image_stack_and_content_v1 } from "./image-stack-and-content-v1"
import { populate_map_and_content_v1 } from "./map-and-content-v1"
import { populate_archive_carousel_listing_v1 } from "../list/archive-carousel-listing-v1"
import { populate_archive_timeline_listing_v1 } from "../list/archive-timeline-listing-v1"
import { populate_contributor_listing_v1 } from "../list/contributor-listing-v1"
import { populate_profile_list_v1 } from "../list/profile-list-v1"
import { populate_session_list_v1 } from "../list/session-list-v1"
import { populate_session_listing_v1 } from "../list/session-listing-v1"
import { populate_session_listing_with_filtration_v1 } from "../list/session-listing-with-filtration-v1"
import { populate_session_schedule_list_v1 } from "../list/session-schedule-list-v1"
import { populate_sponsors_list_v1 } from "../list/sponsors-list-v1"
import { populate_full_bleed_image_v1 } from "../media/full-bleed-image-v1"
import { populate_gallery_v1 } from "../media/gallery-v1"
import { populate_google_map_v1 } from "../media/google-map-v1"
import { populate_image_v1 } from "../media/image-v1"
import { populate_instagram_feed_v1 } from "../media/instagram-feed-v1"
import { populate_responsive_image_v1 } from "../media/responsive-image-v1"
import { populate_vanilla_carousel_v1 } from "../media/vanilla-carousel-v1"
import { populate_horizontal_rule_v1 } from "../miscellaneous/horizontal-rule-v1"
import { populate_image_link_v1 } from "../navigation/image-link-v1"
import { populate_link_v1 } from "../navigation/link-v1"
import { populate_heading_v1 } from "../text/heading-v1"
import { populate_marquee_v1 } from "../text/marquee-v1"
import { populate_plain_string_v1 } from "../text/plain-string-v1"
import { populate_quote_v1 } from "../text/quote-v1"
import { populate_wysiwyg_v1 } from "../text/wysiwyg-v1"

export const SECTION_LIST = {
	"container.image-and-content-v1": {
		populate: populate_image_and_content_v1,
	},
	"container.image-stack-and-content-v1": {
		populate: populate_image_stack_and_content_v1,
	},
	"container.map-and-content-v1": { populate: populate_map_and_content_v1 },
	"list.archive-carousel-listing-v1": {
		populate: populate_archive_carousel_listing_v1,
	},
	"list.archive-timeline-listing-v1": {
		populate: populate_archive_timeline_listing_v1,
	},
	"list.contributor-listing-v1": {
		populate: populate_contributor_listing_v1,
	},
	"list.profile-list-v1": { populate: populate_profile_list_v1 },
	"list.session-list-v1": { populate: populate_session_list_v1 },
	"list.session-listing-v1": { populate: populate_session_listing_v1 },
	"list.session-listing-with-filtration-v1": {
		populate: populate_session_listing_with_filtration_v1,
	},
	"list.session-schedule-list-v1": {
		populate: populate_session_schedule_list_v1,
	},
	"list.sponsors-list-v1": { populate: populate_sponsors_list_v1 },
	"media.full-bleed-image-v1": { populate: populate_full_bleed_image_v1 },
	"media.gallery-v1": { populate: populate_gallery_v1 },
	"media.google-map-v1": { populate: populate_google_map_v1 },
	"media.image-v1": { populate: populate_image_v1 },
	"media.instagram-feed-v1": { populate: populate_instagram_feed_v1 },
	"media.responsive-image-v1": { populate: populate_responsive_image_v1 },
	"media.vanilla-carousel-v1": { populate: populate_vanilla_carousel_v1 },
	"miscellaneous.horizontal-rule-v1": {
		populate: populate_horizontal_rule_v1,
	},
	"navigation.image-link-v1": { populate: populate_image_link_v1 },
	"navigation.link-v1": { populate: populate_link_v1 },
	"text.heading-v1": { populate: populate_heading_v1 },
	"text.marquee-v1": { populate: populate_marquee_v1 },
	"text.plain-string-v1": { populate: populate_plain_string_v1 },
	"text.quote-v1": { populate: populate_quote_v1 },
	"text.wysiwyg-v1": { populate: populate_wysiwyg_v1 },
}

export const populate_section_v1 = {
	content: { on: SECTION_LIST },
	heading: { populate: populate_heading_v1 },
	link: { populate: populate_link_v1 },
	opening_line: { populate: populate_plain_string_v1 },
}
