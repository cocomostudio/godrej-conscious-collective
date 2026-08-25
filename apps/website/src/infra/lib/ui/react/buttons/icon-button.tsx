
/**
 |
 | Icon button — a square button holding one glyph and nothing else.
 |
 | Lifted from the static site, where it is what the carousels' pagination is
 | drawn with. It is deliberately **not** `Button` with the words taken out:
 | `Button` is sized by its text and pads horizontally, so an icon inside one
 | sits in a pill rather than in a square, and the two disagree by a couple of
 | pixels at every emphasis. The design draws these as squares.
 |
 | Only a direct `<svg>` renders. Anything else passed as a child is hidden by
 | the base class rather than laid out, which keeps a stray label from
 | stretching the square — the accessible name comes from `aria-label`, and a
 | button without one says so in the console during development.
 |
 */

import { useRender } from "@base-ui/react/use-render"
import { mergeProps } from "@base-ui/react/merge-props"

type Emphasis = "solid" | "outline" | "none"
type Colour = "theme" | "context" | "white" | "black"

type Icon_Button_Own_Props = {
	emphasis?: Emphasis
	colour?: Colour
}

// The native HTML `color` attribute is omitted so that this component's own
// colour prop can carry the name without colliding with it.
//
// `useRender.ComponentProps` is what adds `render`, exactly as `Button` takes
// it: a link that looks like an icon button is a link, and the schedule's
// download control is one — an anchor works with a middle click, with a
// right-click and without JavaScript, and a button does none of those.
type Icon_Button_Props =
	& Omit<useRender.ComponentProps<"button">, "color">
	& Icon_Button_Own_Props

const BASE_CLASS =
	"inline-flex justify-center items-center rounded cursor-pointer size-8.5 shrink-0 flex-0"
	+ " " + "disabled:cursor-not-allowed disabled:opacity-50"
	+ " " + "aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
	// Hide every direct child that is not an svg, and every svg after the
	// first. A nested svg is untouched, because its parent is what is hidden.
	+ " " + "[&>:not(svg)]:hidden [&>svg~svg]:hidden"

/**
 |
 | The colour drives background, border and text together, and the glyph takes
 | the text colour through `currentColor`. Under `solid` the glyph is the
 | contrasting colour so that it reads against the fill; under `outline` and
 | `none` it is the colour itself.
 |
 */
const COLOUR_CLASSES: Record<Emphasis, Record<Colour, string>> = {
	none: {
		black: "text-black",
		context: "text-context",
		theme: "text-theme",
		white: "text-white",
	},
	outline: {
		black: "border border-black text-black",
		context: "border border-context text-context",
		theme: "border border-theme text-theme",
		white: "border border-white text-white",
	},
	solid: {
		black: "bg-black border border-black text-white",
		context: "bg-context border border-context text-white",
		theme: "bg-theme border border-theme text-white",
		white: "bg-white border border-white text-black",
	},
}

export function Icon_Button ( props: Icon_Button_Props ) {
	const {
		children,
		className,
		colour = "white",
		disabled = false,
		emphasis = "none",
		...rest
	} = props

	if (
		import.meta.env.DEV && !rest["aria-label"] && !rest["aria-labelledby"]
	) {
		console.warn(
			"<Icon_Button /> has no accessible name; pass `aria-label` so the "
				+ "icon-only button is announced by assistive technology.",
		)
	}

	const { render, ...attributes } = rest

	// `disabled` is not an attribute on anything but a `<button>`, so a
	// disabled control rendered as something else says so through ARIA
	// instead — the same translation `Button` makes.
	const defaults: useRender.ElementProps<"button"> = {
		"aria-disabled": disabled || undefined,
		children,
		className: [
			BASE_CLASS,
			COLOUR_CLASSES[emphasis][colour],
			className,
		].filter( Boolean ).join( " " ),
		disabled,
		type: "button",
	}

	// The state object is what emits `data-colour`, `data-emphasis` and
	// `data-disabled`, which is how `Button` does it too — a data attribute
	// written into the props directly is not part of React's button element
	// type, and `useRender` is the thing that knows how to add them.
	return useRender( {
		defaultTagName: "button",
		props: mergeProps<"button">( defaults, attributes ),
		render,
		state: { colour, disabled, emphasis },
	} )
}

export type { Icon_Button_Props }
