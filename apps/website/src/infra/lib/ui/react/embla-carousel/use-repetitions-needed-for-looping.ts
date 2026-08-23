
/**
 |
 | How many times a set of slides has to be repeated for a loop to have
 | something to wrap onto.
 |
 | Lifted from the static site, where the marquee, the sponsors strip and the
 | Instagram feed all need the same answer. A carousel filled from the CMS makes
 | it matter more than it did there: an editor with three slides and a wide
 | screen would otherwise see gaps.
 |
 | The measurement runs in a layout effect, so the server renders exactly two
 | repetitions and the browser re-renders to the measured count.
 |
 */

import {
	useLayoutEffect,
	useState,
} from "react"

export function use_repetitions_needed_for_looping (
	track_dom: HTMLElement | null,
	viewport_dom: HTMLElement | null,
	base_slide_count: number,
) {
	// Start at 2 so the track always renders at least two sets — that lets us
	// measure the distance between equivalent children to get one set's width.
	const [ repeat_count, set_repeat_count ] = useState( 2 )

	useLayoutEffect( () => {
		if ( !track_dom || !viewport_dom || base_slide_count < 1 ) {
			return
		}

		const recompute = () => {
			const children = track_dom.children

			const first = children[0] as HTMLElement | undefined
			const next_set = children[base_slide_count] as
				| HTMLElement
				| undefined

			if ( !first || !next_set ) {
				return
			}

			// Periodic distance: left edge of set 0 to left edge of set 1.
			// This is one set's full width (slides + internal gaps + the gap to
			// the next set) and is stable regardless of repeat_count or any
			// translate Embla applies to the track.
			const one_set_width = next_set.offsetLeft - first.offsetLeft

			if ( one_set_width <= 0 ) {
				return
			}

			// Require content to comfortably exceed the viewport so Embla's
			// loop always has slides to wrap on either side (+1 as a safety
			// buffer).
			const needed_repetitions = Math.max(
				2,
				Math.ceil( ( viewport_dom.clientWidth * 2 ) / one_set_width )
					+ 1,
			)

			// React bails out of the re-render when the value is unchanged.
			set_repeat_count( needed_repetitions )
		}

		recompute()

		// Only the viewport resizing can change the answer. recompute() mutates
		// the track, not the viewport, so this observer cannot re-trigger
		// itself.
		const resize_observer = new ResizeObserver( recompute )
		resize_observer.observe( viewport_dom )

		return () => {
			resize_observer.disconnect()
		}
	}, [ track_dom, viewport_dom, base_slide_count ] )

	return repeat_count
}
