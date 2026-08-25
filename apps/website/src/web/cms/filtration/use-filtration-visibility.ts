
/**
 |
 | Whether the filtration drawer is open.
 |
 | Local to the one subtree that reads it — the listing header that opens the
 | drawer, and the widget it opens — rather than in the sessions provider. It is
 | UI state about a control, not a fact about what the page is showing, and
 | putting it in a context would invite anything on the page to take a
 | dependency on it.
 |
 | **It force-closes as the viewport crosses into the medium breakpoint.** From
 | there up the widget is inline in the sidebar and the trigger is gone, so a
 | drawer left open would be a backdrop over a page with nothing to dismiss it.
 |
 */

import {
	useCallback,
	useState,
} from "react"

import { FROM_THE_MEDIUM_BREAKPOINT } from "./breakpoint.ts"

import { use_media_query_event } from "#infra/lib/ui/react/use-media-query-event.tsx"

export function use_filtration_visibility () {
	const [ visible, set_visible ] = useState( false )

	const show = useCallback( () => set_visible( true ), [] )
	const hide = useCallback( () => set_visible( false ), [] )

	use_media_query_event( FROM_THE_MEDIUM_BREAKPOINT, hide )

	return { hide, show, visible }
}
