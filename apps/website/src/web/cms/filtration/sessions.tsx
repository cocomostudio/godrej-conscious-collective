
/**
 |
 | The set a listing is showing, and the filters that narrowed it.
 |
 | Deliberately small. It holds the **committed** filters — what a visitor has
 | applied — and the rows that survive them, and nothing else.
 |
 | Two things it pointedly does not hold, both lifted from the static site's
 | reasoning:
 |
 |   • **The draft.** While a visitor is ticking boxes, the in-progress
 |     selection lives in a ref inside the form. Nothing renders from it, so
 |     putting it here would re-render every card in the listing on every click.
 |
 |   • **Whether the drawer is open.** One subtree reads that — the header that
 |     opens it and the widget it opens — so it stays local to that subtree
 |     rather than becoming a fact the whole page can take a dependency on.
 |
 | Four contexts rather than one, because they change on four different
 | cadences and React context has no selector: a consumer re-renders whenever
 | the value it reads changes identity, whether or not it reads the part that
 | moved. The rows a listing loaded never change at all; the filtered rows
 | change on every apply.
 |
 */

import type { ReactNode } from "react"
import {
	createContext,
	use,
	useCallback,
	useMemo,
	useState,
} from "react"

import type { Session_Card } from "../envelope.ts"
import type { Filters } from "./filter-sessions.ts"

import {
	filter_sessions,
	NO_FILTERS,
} from "./filter-sessions.ts"

const Filters_Context = createContext<Filters>( NO_FILTERS )
const Loaded_Context = createContext<Session_Card[]>( [] )
const Filtered_Context = createContext<Session_Card[]>( [] )
const Apply_Context = createContext<( filters: Filters ) => void>( () => {} )

export function Sessions<Row extends Session_Card> (
	{ children, sessions }: { children: ReactNode; sessions: Row[] },
) {
	const [ filters, set_filters ] = useState<Filters>( NO_FILTERS )

	const filtered = useMemo(
		() => filter_sessions( sessions, filters ),
		[ sessions, filters ],
	)

	const apply = useCallback(
		( committed: Filters ) => set_filters( committed ),
		[],
	)

	return <Filters_Context value={ filters }>
		<Loaded_Context value={ sessions }>
			<Filtered_Context value={ filtered }>
				<Apply_Context value={ apply }>
					{ children }
				</Apply_Context>
			</Filtered_Context>
		</Loaded_Context>
	</Filters_Context>
}

/** What the listing is currently narrowed by. */
export function use_filters (): Filters {
	return use( Filters_Context )
}

/**
 |
 | Everything the CMS sent, before any filter.
 |
 | The facets are built from this rather than from the filtered set: options
 | derived from what survives would disappear as they were used, so ticking
 | "Day 2" would take away every other day.
 |
 */
export function use_loaded_sessions<Row extends Session_Card> (): Row[] {
	return use( Loaded_Context ) as Row[]
}

/** What survives. This is what a listing draws. */
export function use_filtered_sessions<Row extends Session_Card> (): Row[] {
	return use( Filtered_Context ) as Row[]
}

/** Commit a new set of filters. Called by the form, and by nothing else. */
export function use_apply_filters () {
	return use( Apply_Context )
}

/**
 |
 | How many facets a visitor has asked something of.
 |
 | The trigger says "Filter (2)" rather than counting the boxes, because two
 | days and one age group is two questions asked rather than three answers
 | given — and the widget behind the trigger is a list of facets.
 |
 */
export function facets_in_use ( filters: Filters ): number {
	return Object.values( filters )
		.filter( ( selected ) => selected.length > 0 )
		.length
}
