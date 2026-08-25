
/**
 |
 | Drives the schedule's segmented scroll-progress bar, and tells the day tabs
 | which of them is current.
 |
 | Lifted from the static site, whose `docs/schedule-page/` records the
 | derivation at length. The short version:
 |
 | The bar is divided into one **equal-width** segment per day, however many
 | sessions each day holds, and each segment fills in proportion to how far
 | through *that day's* entries a visitor has scrolled. Progress is therefore not
 | linear in scroll depth — a day with twelve entries and a day with four occupy
 | very different amounts of scrolling and own a third of the bar each.
 |
 | # Why it is driven from scroll position rather than from visibility
 |
 | The obvious implementation attaches an `IntersectionObserver` to every entry
 | and steps a counter as they enter and leave. It **drifts**: the observer
 | coalesces transitions, a fast fling delivers four leave events in one
 | unordered batch, and a counter that steps once per callback has no way back to
 | the truth. Any scheme accumulating a global value from local events can drift.
 |
 | This reads absolute geometry and recomputes from scratch: cached per-day
 | boundaries, measured off the scroll path, and pure arithmetic per frame. A
 | fling lands on the right value on the very next frame because there is no
 | state to be wrong.
 |
 | # What it needs from the markup
 |
 | One CSS invariant, and it is not negotiable: the sticky `bar` and the `list`
 | must share a containing block, or the bar cannot stay stuck while the list
 | scrolls under it. Everything else — whether the container is a block or a
 | flexbox, what is stacked above the bar — is read at runtime.
 |
 */

import type { RefObject } from "react"
import {
	useEffect,
	useRef,
	useState,
} from "react"

export function use_day_scroll_progress (
	{ bar, days, list }: {
		/** The sticky day-tab `<nav>`. Its `::after` reads `--scale-x`. */
		bar: RefObject<HTMLElement | null>
		/** The container holding the entries, each tagged `data-day`. */
		list: RefObject<HTMLElement | null>
		/**
		 |
		 | The fixed set of day keys, one per tab, ascending. Pass a stable
		 | reference: the effect re-runs when its identity changes.
		 |
		 */
		days: string[]
	},
): number {
	// The day at the reading line, or -1 before the list has been scrolled
	// into. Written only when a boundary is crossed, never per frame.
	const [ active, set_active ] = useState( -1 )

	useEffect( () => {
		const bar_element = bar.current
		const list_element = list.current

		if ( bar_element === null || list_element === null ) {
			return
		}

		// Scroll positions at which each day's block reaches the reading line,
		// plus a trailing entry for the end of the list.
		let boundaries: number[] = []
		// The last boundary, clamped to how far the page can actually scroll,
		// so the final day still fills to the end.
		let end = 0
		let current = -1
		let frame = 0

		/**
		 |
		 | Read layout and cache the boundaries. Off the scroll path — on
		 | mount, on resize, and whenever the list's own height changes, which
		 | is what a lazily-loaded picture does.
		 |
		 */
		function measure () {
			// The reading line is the bottom edge of the bar where it comes to
			// rest: its own sticky offset plus its height. Taking the offset
			// from the computed style keeps the line right at every breakpoint
			// without this knowing what, if anything, is stuck above the bar.
			const offset = Number.parseFloat(
				getComputedStyle( bar_element! ).top,
			)
			const horizon = ( Number.isNaN( offset ) ? 0 : offset )
				+ bar_element!.offsetHeight
			const scrolled = window.scrollY
			const items = list_element!.querySelectorAll<HTMLElement>(
				"[data-day]",
			)

			const tops: (number | null)[] = days.map( () => null )
			let last: HTMLElement | null = null

			items.forEach( ( item ) => {
				last = item

				const at = days.indexOf( item.dataset.day ?? "" )

				if ( at !== -1 && tops[at] === null ) {
					tops[at] = item.getBoundingClientRect().top + scrolled
						- horizon
				}
			} )

			const count = days.length
			const next = new Array<number>( count + 1 )

			next[count] = last !== null
				? ( last as HTMLElement ).getBoundingClientRect().bottom
					+ scrolled - horizon
				: 0

			// Filled from the end, so a day whose entries have all been
			// filtered out collapses to a zero-width segment rather than
			// leaving a gap in the bar.
			for ( let at = count - 1; at >= 0; at-- ) {
				next[at] = tops[at] ?? next[at + 1]
			}

			const furthest = Math.max(
				0,
				document.documentElement.scrollHeight - window.innerHeight,
			)

			boundaries = next
			end = Math.min( next[count], furthest )

			update()
		}

		/** Arithmetic against the cached boundaries. No layout reads. */
		function update () {
			if ( bar.current === null || boundaries.length < 2 ) {
				return
			}

			const count = boundaries.length - 1
			const at = Math.min(
				Math.max( window.scrollY, boundaries[0] ),
				end,
			)

			let day = 0

			while ( day < count - 1 && at >= boundaries[day + 1] ) {
				day++
			}

			const from = boundaries[day]
			const to = day === count - 1 ? end : boundaries[day + 1]
			const span = to - from
			const through = span > 0
				? Math.min( Math.max( ( at - from ) / span, 0 ), 1 )
				: 1

			bar.current.style.setProperty(
				"--scale-x",
				String( ( day + through ) / count ),
			)

			// No tab is current until the first day reaches the reading line.
			// Published only on a change, so a re-render happens on a boundary
			// crossing rather than on every frame.
			const now = window.scrollY < boundaries[0] ? -1 : day

			if ( now !== current ) {
				current = now
				set_active( now )
			}
		}

		function on_scroll () {
			if ( frame !== 0 ) {
				return
			}

			frame = requestAnimationFrame( () => {
				frame = 0
				update()
			} )
		}

		measure()

		window.addEventListener( "scroll", on_scroll, { passive: true } )
		window.addEventListener( "resize", measure )

		const observer = new ResizeObserver( measure )
		observer.observe( list_element )

		return () => {
			window.removeEventListener( "scroll", on_scroll )
			window.removeEventListener( "resize", measure )
			observer.disconnect()

			if ( frame !== 0 ) {
				cancelAnimationFrame( frame )
			}
		}
	}, [ bar, days, list ] )

	return active
}
