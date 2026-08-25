
/**
 |
 | `false` on the server and through hydration, `true` from the first
 | post-hydration render onwards.
 |
 | For components that must not appear in the server-rendered markup at all —
 | either because they are inert without JavaScript, or because their
 | server-rendered shape would differ from their hydrated one. The registration
 | form's trigger is both.
 |
 | `useSyncExternalStore` rather than the `useState` + `useEffect` pair, because
 | React drives the flip itself: it renders the server snapshot during
 | hydration, then swaps to the client snapshot in the same commit. No effect
 | has to be scheduled to notice.
 |
 | Lifted from the static site.
 |
 */

import { useSyncExternalStore } from "react"

// Never emits. The value changes exactly once, when React swaps snapshots, and
// there is nothing left to subscribe to after that.
const subscribe = () => () => {}

const get_snapshot = () => true
const get_server_snapshot = () => false

export function use_is_mounted (): boolean {
	return useSyncExternalStore( subscribe, get_snapshot, get_server_snapshot )
}
