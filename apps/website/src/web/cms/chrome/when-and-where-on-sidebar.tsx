
/**
 |
 | The sidebar's copy of <When_And_Where />, and the whole of what makes it
 | different from the footer's: it hides itself as the footer approaches, so
 | the two are never on screen together.
 |
 | Lifted from the static site, where the category listing was the only page
 | that had one. Here it is a property of the two-column arrangement rather
 | than of one page, so it hangs off the root's sidebar and every two-column
 | page gets it.
 |
 | It fades out first, then snaps its height to 0 once the fade completes — no
 | height measurement required. All the collapse state lives here, so scrolling
 | re-renders this leaf alone and never the page above it.
 |
 | The event is the **main** one, like everything else in the chrome. The page
 | this sits on may resolve to a different event; the footer's copy would then
 | disagree with it, and the two are meant to say the same thing.
 |
 */

import type { RefObject } from "react"
import {
	useEffect,
	useState,
} from "react"

import { observe } from "react-intersection-observer"

import type { Event } from "../envelope.ts"

import { MEDIUM_FROM } from "../media.ts"
import { When_And_Where } from "./when-and-where.tsx"

import { use_media_query_event } from "#infra/lib/ui/react/use-media-query-event.tsx"

/**
 |
 | How early — in pixels below the viewport's bottom edge — the
 | IntersectionObserver starts watching the footer. Must comfortably exceed
 | `COLLAPSE_LEAD_PX`, so the per-frame scroll check is already armed before
 | the fade needs to begin.
 |
 */
const NEAR_FOOTER_MARGIN_PX = 900

/**
 |
 | The distance above the viewport's bottom edge at which the footer's top
 | triggers the fade-out — so this copy disappears slightly before the footer,
 | and its own <When_And_Where />, scrolls into view.
 |
 */
const COLLAPSE_LEAD_PX = 650

/**
 |
 | This copy is medium-and-up only (`max-md:hidden` at the call site), so there
 | is nothing to hide below the breakpoint. Every bit of observation is gated on
 | it.
 |
 */
const FROM_THE_MEDIUM_BREAKPOINT = `( min-width: ${MEDIUM_FROM}px )`

/**
 |
 | The opacity fade's duration. Kept in step with the `duration-300` class
 | below: the height is snapped to 0 once this elapses, so the number and the
 | class have to name the same span.
 |
 */
const FADE_MS = 300

type When_And_Where_On_Sidebar_Props = {
	event: Event | null
	/** The site footer, which carries the copy this one gets out of the way of. */
	footer_ref: RefObject<HTMLElement | null>
	className?: string
}

export function When_And_Where_On_Sidebar (
	{ className, event, footer_ref }: When_And_Where_On_Sidebar_Props,
) {
	// `faded` drives the opacity transition; `collapsed` snaps the height to 0
	// once the fade has finished (see the timer effect below).
	const [ faded, set_faded ] = useState( false )
	const [ collapsed, set_collapsed ] = useState( false )

	// Register the observer and the scroll listener only from the medium
	// breakpoint upwards. The hook runs the cleanup we return when the query
	// stops matching, or on unmount, so neither the IntersectionObserver nor
	// the scroll handler exists on viewports where there is nothing to hide.
	use_media_query_event( FROM_THE_MEDIUM_BREAKPOINT, () => {
		const footer = footer_ref.current

		if ( !footer ) {
			return
		}

		let frame = 0
		let detach_scroll = () => {}

		// The coarse trigger: watch the footer entering a generous margin below
		// the viewport. Only while it is near do we attach a passive,
		// rAF-throttled scroll listener for the precise, real-time check — so
		// most of the page scrolls with no scroll handler running at all.
		const unobserve = observe( footer, ( in_view ) => {
			detach_scroll()
			detach_scroll = () => {}

			if ( !in_view ) {
				set_faded( false )
				return
			}

			const check = () => {
				frame = 0
				// `rect.top` is the footer's distance from the viewport's top
				// edge; fade out once it crosses into the lead zone above the
				// bottom edge.
				const rect = footer.getBoundingClientRect()
				set_faded(
					rect.top <= window.innerHeight + COLLAPSE_LEAD_PX,
				)
			}

			const trigger_check = () => {
				if ( frame ) {
					return
				}

				frame = requestAnimationFrame( check )
			}

			check()
			window.addEventListener( "scroll", trigger_check, {
				passive: true,
			} )
			window.addEventListener( "resize", trigger_check, {
				passive: true,
			} )

			detach_scroll = () => {
				window.removeEventListener( "scroll", trigger_check )
				window.removeEventListener( "resize", trigger_check )

				if ( frame ) {
					cancelAnimationFrame( frame )
				}
			}
		}, { rootMargin: `0px 0px ${NEAR_FOOTER_MARGIN_PX}px 0px` } )

		return () => {
			detach_scroll()
			unobserve()
			set_faded( false )
		}
	} )

	// Snap the height once the fade-out completes, and restore it immediately
	// when fading back in, so the content reflows under the fade rather than
	// after it.
	//
	// A timer — not `transitionend` — drives this, so it stays correct when no
	// transition runs at all: reduced motion, an interrupted fade, or a reload
	// that mounts already collapsed.
	useEffect( () => {
		if ( !faded ) {
			set_collapsed( false )
			return
		}

		const timer = setTimeout( () => set_collapsed( true ), FADE_MS )

		return () => clearTimeout( timer )
	}, [ faded ] )

	return <div
		className={ `overflow-hidden transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
			faded ? "opacity-0" : "opacity-100"
		} ${collapsed ? "h-0" : ""}` }>
		<When_And_Where
			className={ className }
			colour_scheme="light"
			event={ event } />
	</div>
}
