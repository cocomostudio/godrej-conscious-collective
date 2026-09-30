
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
 | because no event may be marked main at all. Each palette colour falls back
 | on its own rather than the palette falling back whole: an event that set a
 | theme colour and nothing else keeps its theme colour.
 |
 | **Each palette colour carries twelve button colours beside its base** —
 | the outline button's border and text, and the solid button's border and
 | fill, each at rest, under a pointer and while pressed. Each is a custom
 | property of its own, and **a button colour nobody set is not declared at
 | all**: whatever reads it names the palette colour's base as the fallback,
 | so the browser settles it and no script has to.
 |
 */

import type { CSSProperties } from "react"

import type {
	Event,
	Palette_Colour,
} from "./envelope.ts"

/**
 |
 | The six roles, each with the palette colour attribute it reads and the
 | custom property its base colour is written to.
 |
 */
const ROLES = {
	"theme": { variable: "--ctx-theme-color" },
	"showcase": { variable: "--ctx-showcase-color" },
	"experience": { variable: "--ctx-experience-color" },
	"conversation": { variable: "--ctx-conversation-color" },
	"workshop": { variable: "--ctx-workshop-color" },
	"contributor": { variable: "--ctx-contributor-color" },
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
 | The twelve button colours, each with the attribute that holds its triplet.
 |
 | The key is also the middle of the custom property it is written to —
 | `--ctx-theme-solid-fill-hover-color` — and of the colour token that reads it,
 | `bg-context-solid-fill-hover`. See `tailwind-v3/colors.ts`.
 |
 */
const BUTTON_COLOURS = {
	"outline-border": "outline_button_border__color__rgb",
	"outline-border-hover": "outline_button_border__hover__color__rgb",
	"outline-border-active": "outline_button_border__active__color__rgb",
	"outline-text": "outline_button_text__color__rgb",
	"outline-text-hover": "outline_button_text__hover__color__rgb",
	"outline-text-active": "outline_button_text__active__color__rgb",
	"solid-border": "solid_button_border__color__rgb",
	"solid-border-hover": "solid_button_border__hover__color__rgb",
	"solid-border-active": "solid_button_border__active__color__rgb",
	"solid-fill": "solid_button_fill__color__rgb",
	"solid-fill-hover": "solid_button_fill__hover__color__rgb",
	"solid-fill-active": "solid_button_fill__active__color__rgb",
} as const

type Button_Colour = keyof typeof BUTTON_COLOURS

const BUTTON_COLOUR_NAMES = Object.keys( BUTTON_COLOURS ) as Button_Colour[]

/** Where a button colour of a role, or of the context alias, is written. */
function button_variable ( owner: Role | "context", colour: Button_Colour ) {
	return `--ctx-${owner}-${colour}-color`
}

type Fallback_Colour = {
	base: string
	buttons: Record<Button_Colour, string>
}

/**
 |
 | The palette a page wears when nothing else answers. These are the six
 | literals the static site inlined on every route, and the theme colour is the
 | one the spec names. The button colours are the 2027 event's.
 |
 */
export const FALLBACK_PALETTE: Record<Role, Fallback_Colour> = {
	"contributor": fallback_colour( {
		base: "255, 92, 35",
		hover: "214, 55, 0",
		pressed: "255, 74, 10",
	} ),
	"conversation": fallback_colour( {
		base: "0, 85, 230",
		hover: "0, 57, 153",
		pressed: "0, 75, 204",
	} ),
	"experience": fallback_colour( {
		base: "0, 225, 182",
		hover: "0, 148, 120",
		pressed: "0, 199, 161",
	} ),
	"showcase": fallback_colour( {
		base: "240, 80, 61",
		hover: "208, 37, 16",
		pressed: "238, 59, 37",
	} ),
	"theme": fallback_colour( {
		base: "0, 85, 230",
		hover: "0, 57, 153",
		pressed: "0, 75, 204",
		solid_border_hover: "0, 57, 153",
	} ),
	"workshop": fallback_colour( {
		base: "250, 188, 29",
		hover: "200, 145, 4",
		pressed: "249, 181, 6",
	} ),
}

/**
 |
 | One palette colour's button colours, from the three values the 2027 design
 | gives each: every button part takes the base at rest, the hover value under
 | a pointer and the pressed value while pressed. The one exception is the
 | solid button's border under a pointer, which takes the pressed value unless
 | a colour says otherwise.
 |
 */
function fallback_colour (
	{ base, hover, pressed, solid_border_hover = pressed }: {
		base: string
		hover: string
		pressed: string
		solid_border_hover?: string
	},
): Fallback_Colour {
	const states = { "": base, "-active": pressed, "-hover": hover }
	const buttons = {} as Record<Button_Colour, string>

	for (
		const part of [
			"outline-border",
			"outline-text",
			"solid-border",
			"solid-fill",
		]
	) {
		for ( const [ suffix, value ] of Object.entries( states ) ) {
			buttons[`${part}${suffix}` as Button_Colour] = value
		}
	}

	buttons["solid-border-hover"] = solid_border_hover

	return { base, buttons }
}

/**
 |
 | **Black and white are not roles.**
 |
 | They carry no per-event value and no `--ctx-*` variable of their own: they
 | are two channels of the static palette, which `:root` already holds. Pointing
 | the alias straight at those keeps the whole mechanism intact — what stands
 | behind the alias is still three bare channels, so `bg-context/35` still
 | compiles to plain `rgba()` and every block still carries the one context
 | class it already had.
 |
 */
const STATIC_COLOURS = {
	black: "--color-black",
	white: "--color-white",
} as const

export type Static_Color = keyof typeof STATIC_COLOURS

/**
 |
 | What the context colour may be pointed at: any of the six roles, or plain
 | black or plain white.
 |
 | It is the whole of what a Page's `color_scheme` says, and it is wider than
 | `Role` because two of the eight answers are not roles.
 |
 */
export type Color_Scheme = Role | Static_Color

/**
 |
 | The context colour is an **alias**, not a seventh colour: it points at
 | whichever colour matches what the page is, so a block can say `bg-context`
 | once and be right wherever it is placed.
 |
 | A Page points it at whichever scheme its editor chose, and takes the theme
 | where nobody chose. A Session points it at its category's colour, and a
 | Contributor at the contributor one.
 |
 | It aliases rather than copies so that a page which changes what it is without
 | changing event changes one declaration.
 |
 */
export const DEFAULT_SCHEME: Color_Scheme = "theme"

export function context_colours (
	resolved_event: Event | null,
	color_scheme: Color_Scheme = DEFAULT_SCHEME,
): Record<string, string> {
	const declarations: Record<string, string> = {}

	for ( const [ role, { variable } ] of Object.entries( ROLES ) ) {
		const colour = palette_colour_of( resolved_event, role as Role )
		const fallback = FALLBACK_PALETTE[role as Role]

		declarations[variable] = triplet( colour?.base__color__rgb )
			?? fallback.base

		for ( const name of BUTTON_COLOUR_NAMES ) {
			// An event's palette colour answers for all twelve or for none: a
			// button colour it left empty falls back to its own base, never
			// to another event's button colour.
			const value = colour
				? triplet( colour[BUTTON_COLOURS[name]] )
				: fallback.buttons[name]

			if ( value ) {
				declarations[button_variable( role as Role, name )] = value
			}
		}
	}

	return { ...declarations, ...alias_to( color_scheme ) }
}

function palette_colour_of (
	event: Event | null,
	role: Role,
): Palette_Colour | null {
	const colour = event?.[role]

	return typeof colour === "object" && colour !== null
		? colour as Palette_Colour
		: null
}

/** The one custom property every writer of the alias sets. */
const CONTEXT = "--ctx-context-color"

/**
 |
 | The colour of a solid button's words.
 |
 | White on every palette colour and on black. **Black on white**, because a
 | solid button under a white colour scheme is filled in white, and white words
 | on it would be no words at all.
 |
 */
const SOLID_TEXT = "--ctx-context-solid-text-color"

/**
 |
 | Every declaration that aims the alias: the base colour, its twelve button
 | colours and the solid button's words.
 |
 | Black and white carry no button colours, so every state of every part
 | draws in the scheme's one colour.
 |
 */
function alias_to ( scheme: Color_Scheme ): Record<string, string> {
	if ( scheme in STATIC_COLOURS ) {
		const colour = `var(${STATIC_COLOURS[scheme as Static_Color]})`

		return {
			[CONTEXT]: colour,
			...Object.fromEntries( BUTTON_COLOUR_NAMES.map( ( name ) => [
				button_variable( "context", name ),
				colour,
			] ) ),
			[SOLID_TEXT]: `var(${
				scheme === "white"
					? STATIC_COLOURS.black
					: STATIC_COLOURS.white
			})`,
		}
	}

	const role = scheme as Role
	const base = ROLES[role].variable

	return {
		[CONTEXT]: `var(${base})`,
		...Object.fromEntries( BUTTON_COLOUR_NAMES.map( ( name ) => [
			button_variable( "context", name ),
			// The palette colour's base is the fallback, written into the
			// alias itself: a button colour the event left empty was never
			// declared, and this is what stands in for it.
			`var(${button_variable( role, name )},var(${base}))`,
		] ) ),
		[SOLID_TEXT]: `var(${STATIC_COLOURS.white})`,
	}
}

/**
 |
 | A stored colour scheme, or nothing.
 |
 | An entry saved before the attribute existed comes back with `null` in it, and
 | a value the schema no longer offers is the same kind of nothing. Both take
 | the default, rather than the page drawing against a variable that was never
 | declared.
 |
 */
export function color_scheme_of ( stored: unknown ): Color_Scheme {
	return typeof stored === "string"
			&& ( stored in ROLES || stored in STATIC_COLOURS )
		? stored as Color_Scheme
		: DEFAULT_SCHEME
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
 | what the alias is for; this is only the second place it is aimed. A dark
 | surface is the third, and points it at white.
 |
 | **The button colours are re-pointed with it**, all of them at once, so a
 | button inside the card draws in the card's colours rather than the page's.
 |
 | Returned as a style object rather than a class because there is no class for
 | it: the value is a custom property, and Tailwind compiles classes it can find
 | in the source. The cast is React's — `CSSProperties` has no index signature
 | for custom properties, which every caller of this in the codebase already
 | works around the same way.
 |
 */
export function context_colour_of ( scheme: Color_Scheme ): CSSProperties {
	return alias_to( scheme ) as CSSProperties
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
