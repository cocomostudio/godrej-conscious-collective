
/**
 |
 | Populate fragment for `list.archive-entry-v1`, and the **archive entry
 | list** — the third named list in the catalogue.
 |
 | The section list and the inner list were the whole of the model until this
 | one: a section holds everything, and a composite holds the four components
 | that are words on a page. An archive entry holds neither of those sets. What
 | it holds is a set of *snapshots* — a paragraph, a quotation, a picture, a
 | pair of pictures, a picture beside words — because each one of them becomes a
 | slide of its own on a large, tall screen, and a bare link or a lone heading is
 | not a slide.
 |
 | **This list carries a composite, so the render tree is four dynamic zones
 | deep here rather than three.** The cap the rest of the catalogue keeps is
 | about finiteness, not about the number: the populate object mirrors the schema
 | graph by hand with no recursion, so what has to stay true is that nothing can
 | contain itself. `container.image-and-content-v1` points its own region at the
 | inner list, and no member of the inner list carries a region at all, so the
 | walk still terminates — one level lower than it used to. The depth test in
 | `tests/component-catalogue-shape.test.ts` is what holds the new number, and
 | the cycle test beside it is what holds the rule that actually matters.
 |
 */

import { populate_image_and_content_v1 } from "../container/image-and-content-v1"
import { populate_gallery_v1 } from "../media/gallery-v1"
import { populate_responsive_image_v1 } from "../media/responsive-image-v1"
import { populate_image_v1 } from "../media/image-v1"
import { populate_quote_v1 } from "../text/quote-v1"
import { populate_wysiwyg_v1 } from "../text/wysiwyg-v1"

export const ARCHIVE_ENTRY_LIST = {
	"container.image-and-content-v1": {
		populate: populate_image_and_content_v1,
	},
	"media.gallery-v1": { populate: populate_gallery_v1 },
	"media.responsive-image-v1": { populate: populate_responsive_image_v1 },
	"text.quote-v1": { populate: populate_quote_v1 },
	"text.wysiwyg-v1": { populate: populate_wysiwyg_v1 },
}

export const populate_archive_entry_v1 = {
	content: { on: ARCHIVE_ENTRY_LIST },
	featured_images: { populate: populate_image_v1 },
}
