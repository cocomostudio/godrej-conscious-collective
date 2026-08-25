
/**
 |
 | Which sessions survive a set of filters.
 |
 | This is the one piece of real logic in the filtration widget, and it is the
 | one piece neither HTTP seam can reach: filtering happens in the browser, over
 | a set the CMS already sent whole, so a server-rendered page shows the
 | unfiltered list however the predicate behaves.
 |
 | It is therefore a function of rows and filters and nothing else — no React,
 | no context, no provider — and it is tested as one.
 |
 | **The age group is why this file exists at all.** The static site compares a
 | session's age group against the *lowest* selected threshold, so selecting
 | "Children" alone quietly returns every session for adults as well. The spec
 | lists it as a defect to fix during the lift, and the fix is set membership:
 | a session shows when its own age group is one of the ones asked for.
 |
 */

import {
	describe,
	expect,
	it,
} from "vitest"

import type { Session_Card } from "../src/web/cms/envelope.ts"

import {
	days_of,
	filter_sessions,
	NO_FILTERS,
} from "../src/web/cms/filtration/filter-sessions.ts"

let next = 0

function session ( over: Partial<Session_Card> = {} ): Session_Card {
	next += 1

	return {
		age_group: "All",
		category: "Showcase",
		contributors: [],
		cover: null,
		documentId: `document-${next}`,
		name: `Session ${next}`,
		path: `/sessions/session-${next}`,
		price: null,
		session_date_first: "2025-12-11",
		session_date_last: "2025-12-11",
		standfirst: null,
		...over,
	}
}

function names ( sessions: Session_Card[] ) {
	return sessions.map( ( row ) => row.name )
}

describe("with nothing selected", () => {
	it("every session survives", () => {
		const rows = [ session(), session(), session() ]

		expect( filter_sessions( rows, NO_FILTERS ) ).toEqual( rows )
	})
})

describe("the age group facet", () => {
	const rows = [
		session( { age_group: "All", name: "Open to everyone" } ),
		session( { age_group: "Children", name: "For children" } ),
		session( { age_group: "Adults", name: "For adults" } ),
	]

	// The defect. A threshold comparison answers "For children" *and* "For
	// adults" here, because it asks whether a session's age group is at least
	// the lowest one selected rather than whether it is one of them.
	it("shows the age groups asked for, and no others", () => {
		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			age_groups: [ "Children" ],
		} )

		expect( names( filtered ) ).toEqual( [ "For children" ] )
	})

	it("shows every age group asked for when more than one is", () => {
		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			age_groups: [ "All", "Adults" ],
		} )

		expect( names( filtered ) ).toEqual( [
			"Open to everyone",
			"For adults",
		] )
	})
})

describe("the admission facet", () => {
	const rows = [
		session( { name: "Costs nothing", price: 0 } ),
		session( { name: "Costs something", price: 1599 } ),
		session( { name: "Says nothing about price", price: null } ),
	]

	it("reads a price of zero as free", () => {
		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			admissions: [ "free" ],
		} )

		expect( names( filtered ) ).toEqual( [ "Costs nothing" ] )
	})

	it("reads any price above zero as ticketed", () => {
		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			admissions: [ "ticketed" ],
		} )

		expect( names( filtered ) ).toEqual( [ "Costs something" ] )
	})

	// **A session with no price is neither**, and that is the whole reason the
	// site distinguishes an empty price from a zero one: a visitor who asked
	// for free sessions has not been told this one is free, and a visitor who
	// asked for ticketed ones has not been told it costs anything.
	it("leaves a session with no price out of both", () => {
		const free = filter_sessions( rows, {
			...NO_FILTERS,
			admissions: [ "free" ],
		} )
		const either = filter_sessions( rows, {
			...NO_FILTERS,
			admissions: [ "free", "ticketed" ],
		} )

		expect( names( free ) ).not.toContain( "Says nothing about price" )
		expect( names( either ) ).not.toContain( "Says nothing about price" )
	})
})

describe("the category facet", () => {
	it("shows the categories asked for", () => {
		const rows = [
			session( { category: "Showcase", name: "A showcase" } ),
			session( { category: "Workshop", name: "A workshop" } ),
			session( { category: "Conversation", name: "A conversation" } ),
		]

		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			categories: [ "Workshop", "Conversation" ],
		} )

		expect( names( filtered ) ).toEqual( [
			"A workshop",
			"A conversation",
		] )
	})
})

describe("the day facet", () => {
	// A session running across four days is on every one of them, which is
	// what makes the day question a range question rather than a comparison
	// against a single date.
	const rows = [
		session( {
			name: "The first day only",
			session_date_first: "2025-12-11",
			session_date_last: "2025-12-11",
		} ),
		session( {
			name: "All four days",
			session_date_first: "2025-12-11",
			session_date_last: "2025-12-14",
		} ),
		session( {
			name: "The last day only",
			session_date_first: "2025-12-14",
			session_date_last: "2025-12-14",
		} ),
	]

	it("shows a session running on any day asked for", () => {
		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			days: [ "2025-12-14" ],
		} )

		expect( names( filtered ) ).toEqual( [
			"All four days",
			"The last day only",
		] )
	})

	it("shows a session running on a day between its two ends", () => {
		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			days: [ "2025-12-13" ],
		} )

		expect( names( filtered ) ).toEqual( [ "All four days" ] )
	})

	it("counts a session once however many selected days it spans", () => {
		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			days: [ "2025-12-11", "2025-12-12", "2025-12-13" ],
		} )

		expect( names( filtered ) ).toEqual( [
			"The first day only",
			"All four days",
		] )
	})
})

describe("the days a session runs on", () => {
	it("is every day from its first to its last, inclusive", () => {
		expect( days_of( session( {
			session_date_first: "2025-12-11",
			session_date_last: "2025-12-14",
		} ) ) ).toEqual( [
			"2025-12-11",
			"2025-12-12",
			"2025-12-13",
			"2025-12-14",
		] )
	})

	// Both ends are `date` attributes and are split rather than parsed, for
	// the reason `event-dates.ts` gives — so a range crossing a month boundary
	// has to be counted rather than assumed.
	it("crosses a month without losing a day", () => {
		expect( days_of( session( {
			session_date_first: "2025-11-29",
			session_date_last: "2025-12-02",
		} ) ) ).toEqual( [
			"2025-11-29",
			"2025-11-30",
			"2025-12-01",
			"2025-12-02",
		] )
	})

	it("is the one day, where a session runs on one", () => {
		expect( days_of( session( {
			session_date_first: "2025-12-11",
			session_date_last: "2025-12-11",
		} ) ) ).toEqual( [ "2025-12-11" ] )
	})

	// A session with no dates at all cannot exist — `instances` is required
	// and a middleware derives both ends from them — but a row is what the CMS
	// sent rather than what the schema promises, and a day facet built by
	// crashing on one is worse than a facet that leaves it out.
	it("is nothing, where a session has no dates", () => {
		expect( days_of( session( {
			session_date_first: null,
			session_date_last: null,
		} ) ) ).toEqual( [] )
	})
})

describe("two facets together", () => {
	// Options within one facet widen the answer; facets narrow it. A visitor
	// asking for free workshops means both, not either.
	it("narrows, where options within one facet widen", () => {
		const rows = [
			session( {
				category: "Workshop",
				name: "A free workshop",
				price: 0,
			} ),
			session( {
				category: "Workshop",
				name: "A ticketed workshop",
				price: 900,
			} ),
			session( {
				category: "Showcase",
				name: "A free showcase",
				price: 0,
			} ),
		]

		const filtered = filter_sessions( rows, {
			...NO_FILTERS,
			admissions: [ "free" ],
			categories: [ "Workshop" ],
		} )

		expect( names( filtered ) ).toEqual( [ "A free workshop" ] )
	})
})
