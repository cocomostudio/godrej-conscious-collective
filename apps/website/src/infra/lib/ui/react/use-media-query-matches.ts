
/**
 |
 | The current match state of a media query as a boolean, re-rendering on every
 | crossing. `false` on the server and through hydration.
 |
 | Prefer the sibling `use_media_query_event` when a crossing only has to *do*
 | something — it fires a callback without re-rendering. Reach for this one only
 | when the query decides what gets RENDERED, which in this build is one place:
 | the registration form is housed in a drawer below the medium breakpoint and a
 | dialog from it up, and exactly one of the two may be mounted at a time.
 |
 | `change` fires on crossings, not on resizes: dragging a window from 400px to
 | 1900px produces one event, not hundreds.
 |
 | Lifted from the static site.
 |
 */

import {
	useCallback,
	useSyncExternalStore,
} from "react"

// `matchMedia` hands back a fresh MediaQueryList per call, and `get_snapshot`
// runs on every render as well as on every store read. Cached per query so the
// reader and the listener are looking at the same object.
const list_cache = new Map<string, MediaQueryList>()

function media_query_list ( query: string ) {
	let list = list_cache.get( query )

	if ( !list ) {
		list = window.matchMedia( query )
		list_cache.set( query, list )
	}

	return list
}

export function use_media_query_matches ( query: string ): boolean {
	const subscribe = useCallback( ( on_store_change: () => void ) => {
		const list = media_query_list( query )
		list.addEventListener( "change", on_store_change )

		return () => list.removeEventListener( "change", on_store_change )
	}, [ query ] )

	const get_snapshot = useCallback(
		() => media_query_list( query ).matches,
		[ query ],
	)

	return useSyncExternalStore( subscribe, get_snapshot, () => false )
}
