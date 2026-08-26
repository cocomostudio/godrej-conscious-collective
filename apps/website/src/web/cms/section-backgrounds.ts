
/**
 |
 | A section's background: a gradient, a pattern, and where the pattern sits.
 |
 | Built as one inline style rather than as utility classes, because the two
 | halves both write `background-image` and a class for each would have the
 | second silently replace the first. The static site composes the same two
 | layers inline for exactly that reason, so this is the shape it already has.
 |
 | The colours are named as roles rather than as values. They resolve against
 | the six `--ctx-*` variables the root sets from the resolved event, so a
 | section on a page belonging to a different event paints in that event's
 | colours with nothing here changing.
 |
 */

import type { CSSProperties } from "react"

const LIGHT = "rgb( var( --color-gray-light ) )"

/**
 |
 | Every coloured background is that colour holding for a quarter of the height
 | and then fading into the page's grey. It is the treatment the home page uses
 | for each of its category sections.
 |
 */
function fades_to_light ( colour: string ) {
	return `linear-gradient( to bottom, ${colour}, ${colour} 25%, ${LIGHT} )`
}
function fades_into_colour ( colour: string ) {
	return `linear-gradient( to bottom, ${LIGHT}, ${LIGHT} 25%, ${colour} )`
}

function role ( name: string ) {
	return `rgb( var( --ctx-${name}-color ) )`
}

const GRADIENTS: Record<
	string,
	{ image?: string; colour?: string }
> = {
	"none": {},
	"light": { colour: LIGHT },
	"white-to-light": {
		colour: "#FFFFFF",
		image: `linear-gradient( to bottom, transparent, transparent 50%, ${LIGHT} )`,
	},

	"showcase": { colour: role( "showcase" ) },
	"showcase-to-light": {
		image: fades_to_light( role( "showcase" ) )
	},
	"light-to-showcase": {
		image: fades_into_colour( role( "showcase" ) )
	},

	"conversation": { colour: role( "conversation" ) },
	"conversation-to-light": {
		image: fades_to_light( role( "conversation" ) ),
	},
	"light-to-conversation": {
		image: fades_into_colour( role( "conversation" ) ),
	},

	"experience": { colour: role( "experience" ) },
	"experience-to-light": {
		image: fades_to_light( role( "experience" ) )
	},
	"light-to-experience": {
		image: fades_into_colour( role( "experience" ) ),
	},

	"workshop": { colour: role( "workshop" ) },
	"workshop-to-light": {
		image: fades_to_light( role( "workshop" ) )
	},
	"light-to-workshop": {
		image: fades_into_colour( role( "workshop" ) )
	},

	"collaborator": { colour: role( "collaborator" ) },
	"collaborator-to-light": {
		image: fades_to_light( role( "collaborator" ) ),
	},
	"light-to-collaborator": {
		image: fades_into_colour( role( "collaborator" ) ),
	},

	"theme": { colour: role( "theme" ) },
	"theme-to-light": {
		image: fades_to_light( role( "theme" ) )
	},
	"light-to-theme": {
		image: fades_into_colour( role( "theme" ) )
	},

	"context": { colour: role( "context" ) },
	"light-to-context": {
		image: fades_into_colour( role( "context" ) )
	},
	"context-to-light": {
		image: fades_into_colour( role( "context" ) )
	},
}

const PATTERNS: Record<string, string> = {
	"spider-web-1": "/media/patterns-and-textures/spider-web-pattern-1.svg",
	"spider-web-2": "/media/patterns-and-textures/spider-web-pattern-2.svg",
	"spider-web-3": "/media/patterns-and-textures/spider-web-pattern-3.svg",
}

const POSITIONS: Record<string, string> = {
	"bottom-left": "0 100%",
	"bottom-right": "100% 100%",
	"center": "center",
	"left": "left",
	"right": "right",
	"top-left": "0 0",
	"top-right": "100% 0",
}

export function section_background (
	{ gradient = "none", pattern = "none", position = "left" }: {
		gradient?: string
		pattern?: string
		position?: string
	},
): CSSProperties | undefined {
	const { colour, image } = GRADIENTS[gradient] ?? GRADIENTS.none
	const pattern_url = PATTERNS[pattern]

	// The pattern sits over the gradient, so it is the first layer. Its own
	// position is the one an editor chose; the gradient underneath always
	// starts at the top, because that is the only place a fade downward can
	// start.
	const layers = [
		...( pattern_url ? [ `url( ${pattern_url} )` ] : [] ),
		...( image ? [ image ] : [] ),
	]

	if ( layers.length === 0 && !colour ) {
		return undefined
	}

	return {
		...( colour ? { backgroundColor: colour } : {} ),
		...( layers.length > 0
			? {
				backgroundImage: layers.join( ", " ),
				backgroundPosition: pattern_url
					? `${POSITIONS[position] ?? POSITIONS.left}, 0 0`
					: "0 0",
				backgroundRepeat: "no-repeat",
			}
			: {} ),
	}
}
