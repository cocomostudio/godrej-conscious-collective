/**
 |
 | `useLayoutEffect` on the client, and `useEffect` on the server.
 |
 | `useLayoutEffect` warns during server rendering, and this app is
 | server-rendered. On the client the layout variant is the one that is wanted:
 | it runs before paint, so a state written in it is never painted in its
 | fallback.
 |
 */

import {
	useEffect,
	useLayoutEffect,
} from "react"

export const use_isomorphic_layout_effect = typeof window === "undefined"
	? useEffect
	: useLayoutEffect
