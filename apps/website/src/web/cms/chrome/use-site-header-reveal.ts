/**
 |
 | Slides the site header back in when the reader scrolls up, and away again
 | when the reader scrolls down. Every sticky bar marked `data-under-site-header`
 | moves down to make room for it, in the same frames.
 |
 | ─── WHEN ───────────────────────────────────────────────────────────────────
 |
 | Decided per movement (see `watch_scroll_movements`), never per pixel:
 |
 |   1. Within the first screen of the page it never slides in, and the site
 |      header scrolls away as the page does.
 |   2. Below that, an upward movement of `DELIBERATE` pixels slides it in.
 |   3. A downward movement of `DELIBERATE` pixels slides it away, anywhere.
 |   4. Once in, it stays in on the way back up, until it meets its own place
 |      at the top of the page.
 |   5. Keyboard focus inside it slides it in, wherever the reader is.
 |
 | That minimum is what keeps the site header still while a reader rocks back
 | and forth around one spot.
 |
 | ─── HOW ────────────────────────────────────────────────────────────────────
 |
 | The state is one attribute, `data-site-header`, on the site chrome. The
 | stylesheet turns it into positions: the site header's sticky `top`, and
 | `--site-header-offset`, which every bar below reads as its own `top`. See
 | `site-header-reveal.css`.
 |
 | A change of state therefore moves things in one step. The slide is laid over
 | that step with FLIP: each moving element is measured before and after, and
 | then animated by `transform` from the difference back to nothing. `transform`
 | is one of the properties a browser animates off the main thread, so the slide
 | stays smooth while the page is busy. All the animations start in the same
 | frame, with the same duration and easing, which is what keeps them together.
 |
 | A change that lands mid-slide measures the elements where they are drawn,
 | then replaces the running animations. The motion turns around from there
 | rather than jumping.
 |
 */

import type { RefObject } from "react"
import { useEffect } from "react"

import {
	DELIBERATE,
	is_scroll_locked,
	screen_height,
	watch_scroll_movements,
} from "#infra/lib/ui/react/watch-scroll-movements.ts"

const SLIDE = {
	duration: 200,
	easing: "cubic-bezier(0, 0, 0.2, 1)",
	id: "site-header-slide",
}

type State = "shown" | "parked"

export function use_site_header_reveal (
	{ chrome, header }: {
		chrome: RefObject<HTMLElement | null>
		header: RefObject<HTMLElement | null>
	},
) {
	useEffect( () => {
		const chrome_element = chrome.current
		const header_element = header.current

		if ( chrome_element === null || header_element === null ) {
			return
		}

		const reduced_motion = matchMedia( "(prefers-reduced-motion: reduce)" )

		let state: State = "parked"
		chrome_element.dataset.siteHeader = state

		function change_to ( next: State ) {
			if ( next === state ) {
				return
			}

			state = next

			const moving = [
				header_element!,
				...chrome_element!.querySelectorAll<HTMLElement>( "[data-under-site-header]" ),
			]
			const before = moving.map( ( element ) => element.getBoundingClientRect().top )

			for ( const element of moving ) {
				for ( const animation of element.getAnimations() ) {
					if ( animation.id === SLIDE.id ) {
						animation.cancel()
					}
				}
			}

			chrome_element!.dataset.siteHeader = next

			if ( reduced_motion.matches ) {
				return
			}

			moving.forEach( ( element, index ) => {
				const distance = before[index] - element.getBoundingClientRect().top

				if ( Math.abs( distance ) < 0.5 ) {
					return
				}

				element.animate(
					[ { transform: `translateY(${distance}px)` }, { transform: "none" } ],
					SLIDE,
				)
			} )
		}

		const stop = watch_scroll_movements( ( { movement, y } ) => {
			if ( state === "shown" ) {
				if (
					y <= 0
					|| ( movement.direction === "down" && movement.travelled >= DELIBERATE )
				) {
					change_to( "parked" )
				}

				return
			}

			if (
				movement.direction === "up"
				&& movement.travelled >= DELIBERATE
				&& y >= screen_height()
			) {
				change_to( "shown" )
			}
		} )

		// Keyboard focus only: a tap or a click focuses too, and the menu's own
		// button is inside the site header.
		function on_focus ( event: FocusEvent ) {
			if (
				window.scrollY > 0
				&& !is_scroll_locked()
				&& is_focus_visible( event.target )
			) {
				change_to( "shown" )
			}
		}

		header_element.addEventListener( "focusin", on_focus )

		return () => {
			stop()
			header_element.removeEventListener( "focusin", on_focus )
			delete chrome_element.dataset.siteHeader
		}
	}, [ chrome, header ] )
}

/** `:focus-visible` is missing before Safari 15.4, where `matches` throws. */
function is_focus_visible ( target: EventTarget | null ) {
	try {
		return target instanceof Element && target.matches( ":focus-visible" )
	} catch {
		return true
	}
}
