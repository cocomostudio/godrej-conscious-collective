
/**
 |
 | Calls back when somebody actually clicked — not when they were selecting
 | text, and not when they dragged from one point to another.
 |
 | Lifted from the static site, where the Archive's timeline is what wants it:
 | pressing anywhere on a row opens that edition's snapshots, and a row is wide
 | enough that a visitor scrolling the strip sideways on a phone would otherwise
 | open one every time they let go.
 |
 | **It makes the element neither focusable nor a control**, deliberately. It is
 | a pointer-only convenience laid over something a keyboard can already reach —
 | on the timeline that is the real button inside the row. An element given a
 | click handler and nothing else is invisible to everything that is not a
 | mouse, and this hook is written so that the temptation to treat it as the
 | control is never available.
 |
 */

import type {
	MouseEvent,
	PointerEvent,
} from "react"
import {
	useCallback,
	useEffect,
	useRef,
} from "react"

/**
 |
 | What is assumed to handle its own clicks. A press landing on one of these, or
 | inside one, never reaches the callback.
 |
 */
const IGNORED = [
	"a",
	"button",
	"input",
	"select",
	"textarea",
	"label",
	"[role=\"button\"]",
	"[role=\"link\"]",
].join( ", " )

/** How far the pointer may travel before the gesture is a drag, in pixels. */
const THRESHOLD = 4

export function use_click_without_drag<T extends HTMLElement = HTMLElement> (
	on_click: ( event: MouseEvent<T> ) => void,
) {
	const origin = useRef<{ x: number; y: number } | null>( null )

	// A ref rather than a dependency, so the handlers keep their identity for
	// the life of the component without ever closing over a stale callback.
	const callback = useRef( on_click )

	useEffect( () => {
		callback.current = on_click
	}, [ on_click ] )

	const on_pointer_down = useCallback( ( event: PointerEvent<T> ) => {
		// Only the primary pointer with the primary button starts a gesture.
		if ( !event.isPrimary || event.button !== 0 ) {
			origin.current = null

			return
		}

		origin.current = { x: event.clientX, y: event.clientY }
	}, [] )

	const on_pointer_cancel = useCallback( () => {
		origin.current = null
	}, [] )

	const handle_click = useCallback( ( event: MouseEvent<T> ) => {
		const started = origin.current
		origin.current = null

		const target = event.target as Element | null
		const control = target?.closest( IGNORED )

		if ( control && control !== event.currentTarget ) {
			return
		}

		// `detail === 0` means the press came from the keyboard, so there is
		// no pointer distance to measure and nothing to disqualify.
		if ( started && event.detail > 0 ) {
			const distance = Math.hypot(
				event.clientX - started.x,
				event.clientY - started.y,
			)

			if ( distance > THRESHOLD ) {
				return
			}
		}

		// The gesture ended a text selection inside this element.
		const selection = window.getSelection()

		if (
			selection
			&& !selection.isCollapsed
			&& event.currentTarget.contains( selection.anchorNode )
		) {
			return
		}

		callback.current( event )
	}, [] )

	return {
		onClick: handle_click,
		onPointerCancel: on_pointer_cancel,
		onPointerDown: on_pointer_down,
	}
}
