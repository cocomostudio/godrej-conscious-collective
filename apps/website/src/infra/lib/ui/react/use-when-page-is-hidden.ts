
/**
 |
 | Fires when the page becomes hidden, and — through the cleanup it returns —
 | again when it comes back.
 |
 | The same shape as `use_media_query_event`: an effect that runs on the two
 | crossings that mean something rather than on every change of a value.
 |
 | **Hidden means the tab is in the background, or the window is minimised,
 | or — in Chrome and Safari, though not Firefox — the window is fully covered
 | by another.** A browser that merely loses focus to another application while
 | its window stays on screen is *not* hidden. There is no web API that reports
 | occlusion any more accurately than this, so a fully covered Firefox window
 | is a case nothing here can see.
 |
 | For anything that would otherwise burn a timer, or an animation frame, for a
 | visitor who is not there.
 |
 | Narrowed to the one direction anything here uses.
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
