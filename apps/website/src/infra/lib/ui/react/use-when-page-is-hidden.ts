
/**
 |
 | Fires when the page becomes hidden, and — through the cleanup it returns —
 | again when it comes back.
 |
 | The same shape as `use_media_query_event`: an effect that runs on the two
 | crossings that mean something rather than on every change of a value.
 |
 | One caller, the slideshow beside the registration form, which stops
 | advancing while nobody is looking at it. A slideshow that ran in a
 | background tab would burn a timer for nothing and come back having moved on
 | several slides.
 |
 | Lifted from the static site, narrowed to the one direction anything here
 | uses.
 |
 */

import {
	useEffect,
	useEffectEvent,
} from "react"

type Cleanup = (() => void) | void

export function use_when_page_is_hidden ( handler: () => Cleanup ): void {
	// So the handler always sees the render it was written against, without the
	// effect having to list its closure as a dependency and re-subscribe.
	const on_hidden = useEffectEvent( handler )

	useEffect( () => {
		if ( typeof document === "undefined" ) {
			return
		}

		let cleanup: Cleanup

		const on_change = () => {
			if ( document.visibilityState === "hidden" ) {
				cleanup?.()
				cleanup = on_hidden()
				return
			}

			cleanup?.()
			cleanup = undefined
		}

		document.addEventListener( "visibilitychange", on_change )

		// Already hidden on mount, so fire now rather than waiting for a
		// crossing that has already happened.
		if ( document.visibilityState === "hidden" ) {
			cleanup = on_hidden()
		}

		return () => {
			document.removeEventListener( "visibilitychange", on_change )
			cleanup?.()
		}
	}, [] )
}
