
/**
 |
 | Publishes one element's height onto another as a CSS custom property, and
 | keeps it current as the measured element resizes.
 |
 |     use_height_as_custom_property( {
 |         source: header,
 |         target: container,
 |         property: "--list-header-height",
 |     } )
 |
 | This is the plumbing behind a stack of two sticky elements. The lower one has
 | to be offset by the height of the one stuck above it, and CSS cannot read
 | that height on its own. Publishing it as a custom property keeps the offset
 | **in CSS**, where the breakpoint that turns the stacking on and off already
 | lives — the JavaScript here only reports a number.
 |
 | It is written to the target rather than to the offset element, so that any
 | number of descendants can read it.
 |
 | A measurement taken once at mount goes stale: the measured element re-wraps
 | when the viewport narrows and re-flows when a web font swaps in after first
 | paint. A `ResizeObserver` catches both.
 |
 */

import type { RefObject } from "react"
import {
	useEffect,
	useLayoutEffect,
} from "react"

/**
 |
 | `useLayoutEffect` warns during server rendering, and this app is
 | server-rendered. On the client the layout variant is the one that is wanted —
 | it runs before paint, so the fallback value is never painted.
 |
 */
const use_isomorphic_layout_effect = typeof window === "undefined"
	? useEffect
	: useLayoutEffect

export function use_height_as_custom_property (
	{ property, source, target }: {
		source: RefObject<HTMLElement | null>
		target: RefObject<HTMLElement | null>
		property: string
	},
) {
	use_isomorphic_layout_effect( () => {
		const measured = source.current
		const written_to = target.current

		if ( measured === null || written_to === null ) {
			return
		}

		function publish () {
			written_to!.style.setProperty(
				property,
				`${measured!.getBoundingClientRect().height}px`,
			)
		}

		publish()

		const observer = new ResizeObserver( publish )
		observer.observe( measured )

		return () => {
			observer.disconnect()
			written_to.style.removeProperty( property )
		}
	}, [ source, target, property ] )
}
