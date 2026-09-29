/**
 |
 | Reports the reader's scrolling as **movements**, once per frame.
 |
 |     const stop = watch_scroll_movements( ( { y, movement } ) => {
 |         if ( movement.direction === "up" && movement.travelled >= 64 ) …
 |     } )
 |
 | A movement is continuous scrolling in one direction. It ends when the
 | direction reverses, or when scrolling pauses for `PAUSE_MS`. A flick and
 | the momentum after it are one movement. Many small scrolls with pauses
 | between them are many small movements, and never add up to a large one.
 |
 | Two kinds of scrolling are not the reader's own, and are not reported:
 |
 |   • A jump to an in-page link. The jump, and any smooth scrolling after it,
 |     is skipped until scrolling pauses.
 |
 |   • Scrolling while the page is scroll-locked. The navigation menu locks
 |     `<body>`, and a Base UI drawer or dialog locks `<html>` — and on the way
 |     in and out, Base UI moves the page's scroll position itself. The first
 |     frame after a lock ends is skipped too, for the position it restores.
 |
 | The listener is passive and does its work once per frame at most, reading
 | nothing but `scrollY`.
 |
 */

export const PAUSE_MS = 150

/**
 |
 | How far one movement must travel before it is taken as deliberate, in CSS
 | pixels. Above the 10–30px a trackpad or a resting thumb jitters by, and
 | about the smallest deliberate flick of a thumb.
 |
 */
export const DELIBERATE = 64

/**
 |
 | The height of one screen, for rules that are measured in screens.
 |
 | The root element's client height rather than `innerHeight`: on a phone,
 | `innerHeight` grows as the browser's toolbar collapses mid-scroll, which
 | would move a line measured in screens while the reader is crossing it.
 |
 */
export function screen_height () {
	return document.documentElement.clientHeight
}

export type Movement = {
	direction: "up" | "down" | null
	/** How far the current movement has travelled, in CSS pixels. */
	travelled: number
}

export type Scroll_Frame = {
	y: number
	movement: Movement
}

export function watch_scroll_movements (
	on_frame: ( frame: Scroll_Frame ) => void,
): () => void {
	let last_y = window.scrollY
	let last_event_at = 0
	let movement: Movement = { direction: null, travelled: 0 }
	let skip_until = 0
	let was_locked = false
	let frame = 0

	function resync ( y: number ) {
		last_y = y
		movement = { direction: null, travelled: 0 }
	}

	function on_scroll () {
		const now = performance.now()

		// A jump's own smooth scrolling keeps extending the skip until it
		// pauses.
		if ( now < skip_until ) {
			skip_until = now + PAUSE_MS
		}

		if ( now - last_event_at > PAUSE_MS ) {
			movement = { direction: movement.direction, travelled: 0 }
		}

		last_event_at = now
		frame ||= requestAnimationFrame( report )
	}

	function report () {
		frame = 0

		const y = window.scrollY
		const locked = is_scroll_locked()

		if ( locked || was_locked || performance.now() < skip_until ) {
			was_locked = locked
			resync( y )
			return
		}

		const delta = y - last_y

		if ( delta === 0 ) {
			return
		}

		const direction = delta < 0 ? "up" : "down"

		movement = direction === movement.direction
			? { direction, travelled: movement.travelled + Math.abs( delta ) }
			: { direction, travelled: Math.abs( delta ) }
		last_y = y

		on_frame( { movement, y } )
	}

	function on_click ( event: MouseEvent ) {
		const link = event.target instanceof Element
			? event.target.closest( "a[href]" )
			: null

		if ( link instanceof HTMLAnchorElement && is_in_page( link ) ) {
			skip_until = performance.now() + PAUSE_MS
		}
	}

	function on_hash_change () {
		skip_until = performance.now() + PAUSE_MS
	}

	window.addEventListener( "scroll", on_scroll, { passive: true } )
	document.addEventListener( "click", on_click, { capture: true } )
	window.addEventListener( "hashchange", on_hash_change )

	return () => {
		cancelAnimationFrame( frame )
		window.removeEventListener( "scroll", on_scroll )
		document.removeEventListener( "click", on_click, { capture: true } )
		window.removeEventListener( "hashchange", on_hash_change )
	}
}

function is_in_page ( link: HTMLAnchorElement ) {
	return link.hash !== ""
		&& link.origin === location.origin
		&& link.pathname === location.pathname
}

/** Whether a menu, drawer or dialog has locked the page's scrolling. */
export function is_scroll_locked () {
	const html = document.documentElement

	return html.hasAttribute( "data-base-ui-scroll-locked" )
		|| document.body.style.overflow === "hidden"
		|| html.style.overflowY === "hidden"
		|| document.body.style.overflowY === "hidden"
}
