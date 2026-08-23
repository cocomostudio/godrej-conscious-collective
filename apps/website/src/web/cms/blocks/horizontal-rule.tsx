
/**
 |
 | Horizontal rule — a leaf. A line across the column.
 |
 | Separate from the section's own rule, which sits above a whole section and is
 | part of how sections are spaced. This one is a thing an editor puts between
 | two paragraphs.
 |
 */

const SHADES: Record<string, string> = {
	dark: "border-black/10",
	light: "border-gray-light",
}

export function Horizontal_Rule ( { shade = "light" }: { shade?: string } ) {
	return <hr
		className={ `my-6 md:my-8 border-0 border-t-2 ${
			SHADES[shade] ?? SHADES.light
		}` } />
}
