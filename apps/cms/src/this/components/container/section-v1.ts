
/**
 |
 | Populate fragment for `container.section-v1`.
 |
 | A section's `content` is the **section list** — the dynamic zone an editor
 | places components into. Every component the schema admits needs a branch
 | here by name: a component missing from this map arrives with no attributes at
 | all, and the page renders it as nothing rather than failing.
 |
 */

import { populate_heading_v1 } from "../text/heading-v1"
import { populate_plain_string_v1 } from "../text/plain-string-v1"

export const populate_section_v1 = {
	heading: { populate: populate_heading_v1 },
	content: {
		on: {
			"text.plain-string-v1": { populate: populate_plain_string_v1 },
		},
	},
}
