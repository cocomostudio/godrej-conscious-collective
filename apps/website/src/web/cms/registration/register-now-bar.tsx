/**
 |
 | The Register Now bar at the foot of the screen, below the medium breakpoint:
 | the registration form's trigger, held out of sight until the reader is well
 | into the page.
 |
 | ─── WHEN ───────────────────────────────────────────────────────────────────
 |
 | The **line** is two screens down: the bar's rules turn on whether the bottom
 | of the screen has passed it.
 |
 |   1. The bar starts out of sight.
 |   2. It fades in the moment the bottom of the screen crosses the line.
 |   3. It never leaves while the bottom of the screen is past the line.
 |   4. Above the line, an upward movement of `DELIBERATE` pixels fades it out.
 |      The movement counts from where it started, even below the line.
 |      Smaller movements leave it where it is (see `watch_scroll_movements`).
 |   5. On a page too short to reach the line, it is in sight all the time.
 |
 | That minimum is what keeps the bar still while a reader rocks back and
 | forth around the line.
 |
 | ─── HOW ────────────────────────────────────────────────────────────────────
 |
 | The state is one attribute, `data-register-now`, and the fade is a CSS
 | transition on it. See `register-now-bar.css`.
 |
 | The first state is written before the first paint, so the bar never fades
 | out on arrival.
 |
 */

import type { Event } from "../envelope.ts"

import { useRef } from "react"

import { Registration_Form_Trigger } from "./registration-form-trigger.tsx"

import { use_isomorphic_layout_effect } from "#infra/lib/ui/react/use-isomorphic-layout-effect.ts"
import {
	DELIBERATE,
	screen_height,
	watch_scroll_movements,
} from "#infra/lib/ui/react/watch-scroll-movements.ts"

export function Register_Now_Bar ( { main_event }: { main_event: Event | null } ) {
	const bar = useRef<HTMLDivElement>( null )

	use_isomorphic_layout_effect( () => {
		const element = bar.current

		if ( element === null ) {
			return
		}

		function past_the_line ( y: number ) {
			return y >= screen_height()
		}

		function too_short () {
			return document.documentElement.scrollHeight <= screen_height() * 2
		}

		function show ( shown: boolean ) {
			element!.dataset.registerNow = shown ? "shown" : "hidden"
		}

		let short = too_short()

		show( short || past_the_line( window.scrollY ) )

		const stop = watch_scroll_movements( ( { movement, y } ) => {
			if ( too_short() || past_the_line( y ) ) {
				show( true )
			} else if ( movement.direction === "up" && movement.travelled >= DELIBERATE ) {
				show( false )
			}
		} )

		// A page can change length after the first frame: a block that renders
		// only in the browser, a picture with no size set, a rotated phone. A
		// page that stops being short goes back to the rules for a long one.
		const observer = new ResizeObserver( () => {
			const was_short = short

			short = too_short()

			if ( short ) {
				show( true )
			} else if ( was_short ) {
				show( past_the_line( window.scrollY ) )
			}
		} )

		observer.observe( document.documentElement )

		return () => {
			stop()
			observer.disconnect()
			delete element.dataset.registerNow
		}
	}, [] )

	return <div className="register-now-bar sticky bottom-0 md:hidden z-30" ref={ bar }>
		<div className="register-now-bar__reveal">
			<Registration_Form_Trigger main_event={ main_event } />
		</div>
	</div>
}
