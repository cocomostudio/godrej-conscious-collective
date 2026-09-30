
/**
 |
 | The pattern a section can lay over its background.
 |
 | There is one pattern, the spider web. An editor chooses its colour, which
 | corner or edge it sits against, and how far it turns. It turns about its own
 | centre, so a web turned by 90° spills past the corner it was placed in. The
 | layer clips it to the section, and clipping the layer rather than the
 | section leaves the section's own content free to overflow.
 |
 | The layer sits behind the section's content and above the section's own
 | background. That relies on the section being positioned and isolated, which
 | `section_pattern_host` says for it.
 |
 */

import { text_color_class } from "./blocks/text-color.ts"

import { Spider_Web } from "#infra/lib/ui/react/patterns/spider-web.tsx"

const POSITIONS: Record<string, string> = {
	"bottom-left": "bottom-0 left-0",
	"bottom-right": "bottom-0 right-0",
	"center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
	"left": "top-1/2 left-0 -translate-y-1/2",
	"right": "top-1/2 right-0 -translate-y-1/2",
	"top-left": "top-0 left-0",
	"top-right": "top-0 right-0",
}

export type Section_Pattern_Props = {
	pattern?: string | null
	color?: string | null
	position?: string | null
	rotation?: number | null
}

/**
 |
 | Whether a section draws a pattern at all.
 |
 | Any value other than `spider-web` draws nothing. That includes
 | `spider-web-1`, `spider-web-2` and `spider-web-3`, which a database that has
 | not been reseeded can still hold.
 |
 */
export function has_section_pattern ( pattern: string | null | undefined ) {
	return pattern === "spider-web"
}

/** The classes a section needs for its pattern to sit behind its content. */
export function section_pattern_host ( pattern: string | null | undefined ) {
	return has_section_pattern( pattern ) ? "relative isolate" : ""
}

export function Section_Pattern (
	{ color, pattern, position, rotation }: Section_Pattern_Props,
) {
	if ( !has_section_pattern( pattern ) ) {
		return null
	}

	const colour = text_color_class( color, "black" )
	const place = POSITIONS[position ?? ""] ?? POSITIONS.left
	const turn = rotation ?? 0

	return <div
		aria-hidden="true"
		className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
		<div className={ `absolute ${place}` }>
			<Spider_Web
				className={ `block max-w-none origin-center ${colour}` }
				style={ turn ? { transform: `rotate(${turn}deg)` } : undefined } />
		</div>
	</div>
}
