
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

// Each size bundles its own height + padding + font. Values are flat across all
// breakpoints (the typography tokens themselves carry any responsive scaling).
const SIZE_CLASSES: Record<Size, string> = {
	base: "h-8.5 px-4 text-button font-medium",
	// h:34 border:1 px:16 font:button weight:500 gap:4
	md: "h-9 px-4 text-p font-medium",
	// h:36 px:16 font:paragraph weight:500
	lg: "h-10 px-6 text-h6 font-semibold",
	// h:40 px:24 font:h6 weight:600
}

const BORDER_CLASSES: Partial<Record<Color, string>> = {
	white: "border-white",
	red: "border-red",
	// add others when designs land
}

const BACKGROUND_CLASSES: Partial<Record<Color, string>> = {
	theme: "bg-theme text-gray-light",
	context: "bg-context text-white",
	white: "bg-white text-black",
	black: "bg-black text-white",
	red: "bg-red text-white",
}

const TEXT_CLASSES: Record<Emphasis, Partial<Record<Color, string>>> = {
	outline: {
		theme: "text-theme",
		white: "text-white",
		red: "text-red",
	},
	solid: {
		theme: "text-gray-light",
		context: "text-context",
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
	}
	let text_color_class = text_color === "context"
		? "text-context"
		: TEXT_CLASSES[emphasis][text_color as Color]
	// ↑ `text_color` also admits "default", which no emphasis names; the
	// 	lookup is meant to miss in that case and fall through to no class.

	if ( emphasis === "outline" ) {
		parts.push( "border" )
		const border = BORDER_CLASSES[color]
		parts.push( border ?? "border-current" )
	}
	else if ( emphasis === "solid" ) {
		const border = BORDER_CLASSES[color]
		parts.push( border ?? "border-current" )

		const background = BACKGROUND_CLASSES[color]
		if ( background ) {
			parts.push( background )
		}
	}

	if ( text_color_class ) {
		parts.push( text_color_class )
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
