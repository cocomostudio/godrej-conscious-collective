
/**
 |
 | Horizontal rule — a leaf. A line across the column.
 |
 | Separate from the section's own rule, which is drawn below a whole section.
 | This one is a thing an editor puts between two paragraphs.
 |
 | **A rule carries its own spacing**: 16px on either side, and 32px from the
 | medium breakpoint. That holds between two blocks in a section and between two
 | paragraphs of prose alike. Blocks beside it shrink their own margins to
 | match, so the collapse lands on the rule's value; see `block-spacing.ts`.
 |
 */

import { RULE_SPACING } from "./block-spacing.ts"

const SHADES: Record<string, string> = {
	dark: "border-black/10",
	light: "border-gray-light",
}

export function Horizontal_Rule ( { shade = "light" }: { shade?: string } ) {
	return <hr
		className={ `${RULE_SPACING} border-0 border-t-2 ${
			SHADES[shade] ?? SHADES.light
		}` } />
}
