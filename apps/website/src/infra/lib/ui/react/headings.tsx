
/**
 |
 | `react-accessible-headings`, with types this project can use.
 |
 | The package ships React 18 typings of its own, so its `Level` declares
 | children as React 18's `ReactNode` — which React 19's is not assignable to,
 | because 19 added `bigint`. Every block that nests would otherwise carry the
 | same cast, so the cast lives here once, in the one place that explains it.
 |
 | Nothing else about the library is wrapped: `H` picks the element from how
 | deeply it sits, and that is exactly what is wanted.
 |
 */

import type { ReactNode } from "react"

import {
	H,
	Level as Accessible_Level,
} from "react-accessible-headings"

type Level_Props = {
	children: ReactNode
	value?: number
}

export function Level ( { children, value }: Level_Props ) {
	const Untyped = Accessible_Level as unknown as (
		props: { children: unknown; value?: number },
	) => ReactNode

	return <Untyped value={ value }>{ children }</Untyped>
}

export { H }
