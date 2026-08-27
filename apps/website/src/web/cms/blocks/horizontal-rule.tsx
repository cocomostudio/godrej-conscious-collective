
/**
 |
 | Horizontal rule — a leaf. A line across the column.
 |
 | Separate from the section's own rule, which is drawn below a whole section.
 | This one is a thing an editor puts between two paragraphs.
 |
 | **A rule carries no spacing of its own**, here or on a section. It once
 | carried `my-6 md:my-8`, which is what the blocks on either side of it already
 | leave: those are margins on adjacent siblings in ordinary flow, so they
 | collapse and the gap was never the sum. The one place it showed was a rule
 | placed last in a section, where its own bottom margin — with no `last:mb-0`
 | to cancel it, unlike `BLOCK_SPACING` — pushed into the section's padding.
 |
 | A passage of prose is the one flow where that leaves nothing at all above a
 | rule: it spaces itself from the top, `mt-4` on each paragraph and nothing on
 | the bottom, so a `---` an editor typed sits on the line before it.
 |
 */

const SHADES: Record<string, string> = {
	dark: "border-black/10",
	light: "border-gray-light",
}

export function Horizontal_Rule ( { shade = "light" }: { shade?: string } ) {
	return <hr
		className={ `border-0 border-t-2 ${
			SHADES[shade] ?? SHADES.light
		}` } />
}
