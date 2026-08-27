
/**
 |
 | The six context colours, as CSS custom properties on the page's own root.
 |
 | The mechanism is the static site's, unchanged: every colour token compiles to
 | `rgba( var( --ctx-…-color ), <alpha-value> )`, so a colour reaches the
 | browser as three bare channels and an opacity modifier such as `bg-theme/35`
 | emits plain `rgba()` rather than `color-mix()`, which none of Safari 15,
 | Firefox 92 or Chrome 94 supports. What is new is only that the values vary by
 | event instead of being the same six literals on every route.
 |
 | They are set on the page's outermost element rather than anywhere above it,
 | because two pages on the same site can belong to different events. A
 | declaration on `:root` would be site-wide, which is the thing this replaces.
 |
 | **Three levels, not two.** The resolved event is already the second — the
 | entry's own event, failing that the main event — and this is the third,
 | because no event may be marked main at all. Each colour falls back on its own
 | rather than the palette falling back whole: an event that set a theme colour
 | and nothing else keeps its theme colour.
 |
 */

import type { CSSProperties } from "react"

import type { Event } from "./envelope.ts"

/**
 |
 | The six roles, each with the attribute it reads and the custom property it
 | is written to.
 |
 */
const ROLES = {
	"theme": {
		attribute: "colour_theme_rgb",
		variable: "--ctx-theme-color",
	},
	"showcase": {
		attribute: "colour_showcase_rgb",
		variable: "--ctx-showcase-color",
	},
	"experience": {
		attribute: "colour_experience_rgb",
		variable: "--ctx-experience-color",
	},
	"conversation": {
		attribute: "colour_conversation_rgb",
		variable: "--ctx-conversation-color",
	},
	"workshop": {
		attribute: "colour_workshop_rgb",
		variable: "--ctx-workshop-color",
	},
	"contributor": {
		attribute: "colour_contributor_rgb",
		variable: "--ctx-contributor-color",
	},
} as const

export type Role = keyof typeof ROLES

/**
 |
 | **A role becomes a class here and nowhere else.**
 |
 | One prefix is left, and it is the dot beside a category in the filtration
 | widget: four options in four colours, all four on screen at once, so there is
 | no single thing for the context colour to be pointed at. Everywhere else that
 | used to name a role by class re-points the alias instead — see
 | `context_colour_of` below.
 |
 | The classes are written out rather than composed from the role name, because
 | Tailwind scans for whole class names in the source: `bg-${role}` is a class
 | that never gets compiled.
 |
 */
export const ROLE_BACKGROUND: Record<Role, string> = {
	contributor: "bg-contributor",
	conversation: "bg-conversation",
	experience: "bg-experience",
	showcase: "bg-showcase",
	theme: "bg-theme",
	workshop: "bg-workshop",
}

/**
 |
 | The palette a page wears when nothing else answers. These are the six
 | literals the static site inlined on every route, and the theme colour is the
 | one the spec names.
 |
 */
export const FALLBACK_PALETTE: Record<Role, string> = {
	"contributor": "255, 92, 35",
	"conversation": "0, 85, 230",
	"experience": "0, 225, 182",
	"showcase": "240, 80, 61",
	"theme": "0, 85, 230",
	"workshop": "250, 188, 29",
}

/**
 |
 | The context colour is an **alias**, not a seventh colour: it points at
 | whichever of the six matches what the page is, so a block can say
 | `bg-context` once and be right wherever it is placed.
 |
 | A Page has no role of its own and takes the theme. A Session points it at its
 | category's colour, and a Contributor will point it at the contributor one.
 |
 | It aliases rather than copies so that a page which changes role without
 | changing event changes one declaration.
 |
 */
const DEFAULT_ROLE: Role = "theme"

export function context_colours (
	resolved_event: Event | null,
	context_role: Role = DEFAULT_ROLE,
): Record<string, string> {
	const declarations: Record<string, string> = {}

	for ( const [ role, { attribute, variable } ] of Object.entries( ROLES ) ) {
		declarations[variable] = triplet( resolved_event?.[attribute] )
			?? FALLBACK_PALETTE[role as Role]
	}

	declarations[CONTEXT] = alias_to( context_role )

	return declarations
}

/** The one custom property both writers of the alias set. */
const CONTEXT = "--ctx-context-color"

function alias_to ( role: Role ) {
	return `var(${ROLES[role].variable})`
}

/**
 |
 | **The same alias, re-pointed part-way down a page.**
 |
 | `context_colours` sets the alias once, on the page's outermost element, and
 | that answers for a page which *is* one thing. A listing is not: ten cards of
 | four categories, each of which has to draw itself in its own colour, and a
 | page-wide alias would draw all ten in the page's.
 |
 | So a card re-points it on its own element. Everything below inherits the new
 | value and nothing above sees it, which means one class — `text-context`,
 | `group-hover:bg-context` — paints in four colours down a single page. That is
 | what the alias is for; this is only the second place it is aimed.
 |
 | Returned as a style object rather than a class because there is no class for
 | it: the value is a custom property, and Tailwind compiles classes it can find
 | in the source. The cast is React's — `CSSProperties` has no index signature
 | for custom properties, which every caller of this in the codebase already
 | works around the same way.
 |
 */
export function context_colour_of ( role: Role ): CSSProperties {
	return { [CONTEXT]: alias_to( role ) } as CSSProperties
}

/**
 |
 | An RGB channel triplet, or nothing.
 |
 | A colour an editor never set arrives as null, and so does one the CMS could
 | not parse. Both mean the same thing here — this role has no colour of its own
 | — and both fall through to the palette.
 |
 */
function triplet ( value: unknown ): string | null {
	return typeof value === "string" && value.trim() !== ""
		? value.trim()
		: null
}
