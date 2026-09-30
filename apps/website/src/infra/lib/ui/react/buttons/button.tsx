
/**
 |
 | Button.
 |
 | Lifted from the static site, where it is the one element the design presses
 | into service for every call to action — the back link, Register Now, the
 | filtration triggers. It renders as whatever `render` is given, so a link that
 | looks like a button is a link.
 |
 | `size`, `emphasis` and `color` are the design's own axes rather than
 | speculation: the static site uses all three, and this build inherits the
 | places that do.
 |
 */

import type {
	MouseEvent,
	ReactNode,
} from "react"
import {
	Children,
	createContext,
	lazy,
	Suspense,
	use,
	useRef,
} from "react"
import { useRender } from "@base-ui/react/use-render"
import { mergeProps } from "@base-ui/react/merge-props"
import { ICON_MAP } from "../icons/index.ts"
import { PALETTE_BUTTON_COLOURS } from "./palette-button-colours.ts"

type Size = "base" | "md" | "lg"
type Emphasis = "solid" | "outline" | "none" | "custom"
type Color = "theme" | "context" | "white" | "black" | "red" | "none"

type Button_Own_Props = {
	size?: Size
	emphasis?: Emphasis
	color?: Color
	text_color?: Color | "default"
}

// `useRender.ComponentProps<'button'>` extends button props with `render` and
// strips the things `useRender` controls. We omit the native `color` attribute
// (legacy HTML thing) so our `color` prop can take that name cleanly.
type Button_Props =
	& Omit<useRender.ComponentProps<"button">, "color">
	& Button_Own_Props

type Button_State = {
	size: Size
	emphasis: Emphasis
	color: Color
	text_color: Color | "default"
	disabled: boolean
}

const BASE_CLASS =
	"inline-flex justify-center items-center rounded cursor-pointer whitespace-nowrap gap-1"
	+ " " + "disabled:cursor-not-allowed disabled:opacity-50"
	+ " " + "aria-disabled:cursor-not-allowed aria-disabled:opacity-50"

// Each size bundles its own height + font. Values are flat across all
// breakpoints (the typography tokens themselves carry any responsive scaling).
const SIZE_CLASSES: Record<Size, string> = {
	base: "h-8.5 text-button font-medium",
	// h:34 font:button weight:500 gap:4
	md: "h-9 text-p font-medium",
	// h:36 font:paragraph weight:500
	lg: "h-10 text-h6 font-semibold",
	// h:40 font:h6 weight:600
}

// px:16, 16 and 24.
const PADDING_CLASSES: Record<Size, string> = {
	base: "px-4",
	md: "px-4",
	lg: "px-6",
}

// **A solid button carries a 1px border, and gives the pixel back from its
// padding** on each side, so that it is no wider than it was without one. The
// heights are fixed and absorb the border already.
const SOLID_PADDING_CLASSES: Record<Size, string> = {
	base: "px-3.75",
	md: "px-3.75",
	lg: "px-5.75",
}

/**
 |
 | **The two palette colours draw from the event's button colours**, border,
 | words and fill alike, at rest, under a pointer and while pressed. See
 | `palette-button-colours.ts`.
 |
 */
function is_palette_colour ( color: Color ): color is "theme" | "context" {
	return color === "theme" || color === "context"
}

// The fixed colours. **A solid button's border is its fill's colour**, so it
// is there at every state without being seen.
const BORDER_CLASSES: Partial<Record<Color, string>> = {
	white: "border-white",
	black: "border-black",
	red: "border-red",
}

const BACKGROUND_CLASSES: Partial<Record<Color, string>> = {
	white: "bg-white",
	black: "bg-black",
	red: "bg-red",
}

const TEXT_CLASSES: Record<Emphasis, Partial<Record<Color, string>>> = {
	outline: {
		white: "text-white",
		black: "text-black",
		red: "text-red",
	},
	solid: {
		white: "text-black",
		black: "text-white",
		red: "text-white",
	},
	none: {},
	custom: {},
}

function build_class_name (
	{ size, emphasis, color, text_color }: Button_State,
) {
	const parts = [ BASE_CLASS ]
	const size_class = SIZE_CLASSES[size]
	if ( size_class ) {
		parts.push( size_class )
		parts.push(
			( emphasis === "solid"
				? SOLID_PADDING_CLASSES
				: PADDING_CLASSES )[
					size
				],
		)
	}

	const drawn = emphasis === "outline" || emphasis === "solid"

	if ( drawn ) {
		parts.push( "border" )
	}

	if ( drawn && is_palette_colour( color ) ) {
		parts.push( PALETTE_BUTTON_COLOURS[emphasis][color] )
	}
	else if ( drawn ) {
		parts.push( BORDER_CLASSES[color] ?? "border-current" )

		if ( emphasis === "solid" ) {
			const background = BACKGROUND_CLASSES[color]
			if ( background ) {
				parts.push( background )
			}
		}
	}

	// A text colour of its own, unless the palette colour's classes above
	// already answered for the words and the caller asked for nothing else.
	if ( !( drawn && is_palette_colour( color ) && text_color === color ) ) {
		const text_color_class = text_color === "context"
			? "text-context"
			: TEXT_CLASSES[emphasis][text_color as Color]
		// ↑ `text_color` also admits "default", which no emphasis names; the
		// 	lookup is meant to miss in that case and fall through to no class.

		if ( text_color_class ) {
			parts.push( text_color_class )
		}
	}

	return parts.join( " " )
}

const Button_Context = createContext( false )

function Button ( props: Button_Props ) {
	const {
		render,
		size = "base",
		emphasis = "outline",
		color = "none",
		text_color = color,
		disabled = false,
		onClick,
		children,
		...rest
	} = props

	const state: Button_State = { size, emphasis, color, text_color, disabled }
	const element_ref = useRef<HTMLElement | null>( null )

	// When rendered as a non-button (e.g. <a>), `disabled` isn't a real attribute.
	// Translate to aria-disabled + guard the click handler so the component
	// behaves correctly under any render target.
	const guarded_on_click = ( event: MouseEvent<HTMLElement> ) => {
		if ( disabled ) {
			event.preventDefault()
			event.stopPropagation()
			return
		}
		onClick?.( event as MouseEvent<HTMLButtonElement> )
	}

	const default_props: useRender.ElementProps<"button"> = {
		type: "button",
		className: build_class_name( state ),
		"aria-disabled": disabled || undefined,
		// Only set `disabled` when actually a <button> — see note below.
		disabled,
		onClick: guarded_on_click,
		children: wrap_children( children ),
	}

	const element = useRender( {
		defaultTagName: "button",
		render,
		ref: element_ref,
		state, // -> emits data-size, data-emphasis, data-color, data-disabled
		props: mergeProps<"button">( default_props, rest ),
	} )

	return <Button_Context value={ true }>{ element }</Button_Context>
}

function wrap_children ( children: ReactNode ) {
	return Children.map( children, wrap_strings_within_spans )
}
function wrap_strings_within_spans ( children: ReactNode ) {
	if ( typeof children === "string" ) {
		return <span>{ children }</span>
	}
	return children
}

// Build the lazy map once, at module load. Stable identity, no per-mount cost,
// no stale-closure bugs when `name` changes.
const ICONS: Record<keyof typeof ICON_MAP, ReturnType<typeof lazy>> = Object
	.fromEntries(
		Object.entries( ICON_MAP ).map( ( [ key, file ] ) => [
			key,
			lazy( () => import( `../icons/${file}.tsx` ) ),
		] ),
	) as never

function Button_Icon ( { name }: { name: keyof typeof ICON_MAP } ) {
	const inside_a_button = use( Button_Context )
	if ( !inside_a_button ) {
		throw new Error(
			"<Button.Icon /> can only be used within a <Button />.",
		)
	}
	const Icon = ICONS[name]
	if ( !Icon ) {
		throw new Error(
			`Icon "${name}" cannot be found.`,
		)
	}

	return (
		<Suspense fallback={ null }>
			<Icon className="inline [&_*]:stroke-current first:-ml-1 last:-mr-1" />
		</Suspense>
	)
}

Button.Icon = Button_Icon

export { Button }
export type {
	Button_Props,
	Button_State,
}
