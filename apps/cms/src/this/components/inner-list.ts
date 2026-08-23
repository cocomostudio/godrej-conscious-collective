
/**
 |
 | The **inner list** — the four components a composite may hold.
 |
 | Heading, plain string, WYSIWYG and link, and deliberately nothing else. Every
 | composite points its `content` zone here, and none of the four carries a zone
 | of its own, which is what caps the render tree at three dynamic zones and
 | keeps this populate object finite.
 |
 | It lives beside the fragments rather than inside one of them because three
 | composites share it and a fourth will: three copies of one list is three
 | places for the depth cap to be broken in one.
 |
 */

import { populate_link_v1 } from "./navigation/link-v1"
import { populate_heading_v1 } from "./text/heading-v1"
import { populate_plain_string_v1 } from "./text/plain-string-v1"
import { populate_wysiwyg_v1 } from "./text/wysiwyg-v1"

export const INNER_LIST = {
	"navigation.link-v1": { populate: populate_link_v1 },
	"text.heading-v1": { populate: populate_heading_v1 },
	"text.plain-string-v1": { populate: populate_plain_string_v1 },
	"text.wysiwyg-v1": { populate: populate_wysiwyg_v1 },
}
