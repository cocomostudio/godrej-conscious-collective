
/**
 |
 | Fires when a media query **starts** matching, and again — through the cleanup
 | it returns — when the query stops.
 |
 | Lifted from the static site, where the site header uses it to close the
 | mobile navigation as the viewport crosses into desktop. An effect keyed on a
 | width would run on every resize; this runs on the two crossings that mean
 | something.
 |
 */

import {
	useEffect,
	useEffectEvent,
} from "react"

type Cleanup = (() => void) | void

export function use_media_query_event (
	query: string,
	handler: () => Cleanup,
): void {
	// So the handler always sees the render it was written against, without the
	// effect having to list its closure as a dependency and re-subscribe.
	const on_enter = useEffectEvent( handler )

	useEffect( () => {
		if ( typeof window === "undefined" ) {
			return
		}

		const media_query = window.matchMedia( query )
		let cleanup: Cleanup

		const listener = ( event: MediaQueryListEvent ) => {
			if ( event.matches ) {
				cleanup = on_enter()
				return
			}

			cleanup?.()
			cleanup = undefined
		}

		media_query.addEventListener( "change", listener )

		// Already matching on mount, so fire now rather than leaving the caller
		// waiting for a crossing that has already happened.
		if ( media_query.matches ) {
			cleanup = on_enter()
		}

		return () => {
			media_query.removeEventListener( "change", listener )
			cleanup?.()
		}
	}, [ query ] )
}
