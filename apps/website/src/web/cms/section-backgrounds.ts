
/**
 |
 | A section's background gradient, as one inline style.
 |
 | The pattern that can sit over it is not part of this style. It is drawn as
 | a layer of its own, by `section-pattern.tsx`, because an editor can turn it.
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
		image:
			`linear-gradient( to bottom, transparent, transparent 50%, ${LIGHT} )`,
	},

	"showcase": { colour: role( "showcase" ) },
	"showcase-to-light": {
		image: fades_to_light( role( "showcase" ) ),
	},
	"light-to-showcase": {
		image: fades_into_colour( role( "showcase" ) ),
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
		image: fades_to_light( role( "experience" ) ),
	},
	"light-to-experience": {
		image: fades_into_colour( role( "experience" ) ),
	},

	"workshop": { colour: role( "workshop" ) },
	"workshop-to-light": {
		image: fades_to_light( role( "workshop" ) ),
	},
	"light-to-workshop": {
		image: fades_into_colour( role( "workshop" ) ),
	},

	"contributor": { colour: role( "contributor" ) },
	"contributor-to-light": {
		image: fades_to_light( role( "contributor" ) ),
	},
	"light-to-contributor": {
		image: fades_into_colour( role( "contributor" ) ),
	},

	"theme": { colour: role( "theme" ) },
	"theme-to-light": {
		image: fades_to_light( role( "theme" ) ),
	},
	"light-to-theme": {
		image: fades_into_colour( role( "theme" ) ),
	},

	"context": { colour: role( "context" ) },
	"light-to-context": {
		image: fades_into_colour( role( "context" ) ),
	},
	"context-to-light": {
		image: fades_into_colour( role( "context" ) ),
	},
}

export function section_background (
	{ gradient = "none" }: { gradient?: string },
): CSSProperties | undefined {
	const { colour, image } = GRADIENTS[gradient] ?? GRADIENTS.none

	if ( !image && !colour ) {
		return undefined
	}

	return {
		...( colour ? { backgroundColor: colour } : {} ),
		...( image
			? {
				backgroundImage: image,
				backgroundPosition: "0 0",
				backgroundRepeat: "no-repeat",
			}
			: {} ),
	}
}
