
/**
 |
 | The category listing pages and the schedule page, rendered end to end.
 |
 | What can be asserted here is what a visitor is served **before any
 | JavaScript runs**, and that boundary decides the whole file. Filtering
 | happens in the browser over a set the CMS already sent, so every assertion
 | below is about the unfiltered page: how much of the category arrived, what
 | the header says about it, what the widget offers to narrow it by, and where
 | the widget can be found.
 |
 | **The widget's placement is a client-side move, by construction.** A fill
 | registers itself in a layout effect, which does not run on the server, so a
 | server-rendered page carries the widget where it stands and hydration takes
 | it to the sidebar. That is the tunnel's design rather than an accident here —
 | one pass over a tree cannot fill a slot that was rendered before the fill —
 | and it means this seam can assert the widget is *served* but not that it has
 | *arrived*. The predicate's own tests are in `session-filters.test.ts`; what
 | no seam reaches is written down in the ticket.
 |
 | `body_of` strips the hydration payload, for the reason the other files give:
 | React Router streams the loader's data back down as a script, so every string
 | the CMS sent is in the response whether it was rendered or not.
 |
 */

import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
} from "vitest"

import { FROM_THE_MEDIUM_BREAKPOINT } from "../src/web/cms/filtration/breakpoint.ts"
import { screens } from "../src/infra/lib/ui/app-shells/primary/tailwind-v3/screens.ts"
import {
	type Website,
	boot_website,
} from "./support/boot-website.ts"
import {
	envelope,
	event,
	instance,
	responsive_image,
	section,
	session_card,
	session_listing_with_filtration,
	session_schedule_list,
	session_schedule_row,
} from "./support/envelopes.ts"

let website: Website

/**
 |
 | Twelve showcases, which is above the ten every other listing is capped at —
 | so a page that answered with ten would be a page that kept the cap.
 |
 | They are deliberately varied along the three axes a category page filters by:
 | days, age groups, and whether a place has to be paid for.
 |
 */
const SHOWCASES = [
	session_card( {
		category: "Showcase",
		name: "Living with the Land",
		price: 1599,
		session_date_first: "2025-12-11",
		session_date_last: "2025-12-14",
	} ),
	session_card( {
		age_group: "Children",
		category: "Showcase",
		cover: responsive_image( "https://pictures.test/force.jpg" ),
		name: "The Force Within",
		price: 0,
		session_date_first: "2025-12-12",
		session_date_last: "2025-12-12",
	} ),
	...Array.from( { length: 10 }, ( _unused, index ) =>
		session_card( {
			age_group: "Adults",
			category: "Showcase",
			name: `Site Notes ${index + 1}`,
			price: 400,
			session_date_first: "2025-12-13",
			session_date_last: "2025-12-13",
		} ) ),
]

const SCHEDULE = [
	// Two sittings, so the schedule's count is provably per instance rather
	// than per session.
	session_schedule_row( {
		category: "Workshop",
		instances: [
			instance( "2025-12-11", "10:00", "12:30" ),
			instance( "2025-12-12", "10:00", "12:30" ),
		],
		name: "Block Printing with Native Cotton",
		price: 900,
	} ),
	session_schedule_row( {
		all_day_event: true,
		category: "Showcase",
		instances: [ instance( "2025-12-13", "09:00", "21:00" ) ],
		name: "Reweaving the Ecosystem",
	} ),
	session_schedule_row( {
		category: "Conversation",
		instances: [ instance( "2025-12-13", "16:00", "17:00" ) ],
		name: "Designing for Heat",
		price: 0,
	} ),
]

const SCHEDULE_DOCUMENT = {
	ext: ".pdf",
	name: "conscious-collective-2027-schedule.pdf",
	size: 12,
	url: "/uploads/conscious_collective_2027_schedule.pdf",
}

beforeAll( async () => {
	website = await boot_website( {
		// A category page with no sidebar to portal into. The widget has
		// nowhere to go and renders where it stands, which is the tunnel's own
		// fallback rather than a branch in the block.
		"/experiences": envelope( {
			main_region: [
				section( "Experiences — the listing", {
					content: [
						session_listing_with_filtration( "Experience", [
							session_card( {
								category: "Experience",
								name: "The Cooling Pergola",
								price: 0,
							} ),
							session_card( {
								age_group: "Adults",
								category: "Experience",
								name: "Salt and Silt",
								price: 250,
							} ),
						] ),
					],
				} ),
			],
			page_layout: "one-column",
			standfirst: "Things to walk through, touch and take part in.",
			title: "Experiences",
		} ),

		// A category holding exactly one session, so the header's singular is
		// asserted against a page that really has one rather than against a
		// string built by hand.
		"/conversations": envelope( {
			main_region: [
				section( "Conversations — the listing", {
					content: [ session_listing_with_filtration(
						"Conversation",
						[ session_card( {
							category: "Conversation",
							name: "Designing for Heat",
						} ) ],
					) ],
				} ),
			],
			title: "Conversations",
		} ),

		"/schedule": envelope( {
			main_region: [
				section( "The schedule", {
					content: [ session_schedule_list(
						SCHEDULE,
						SCHEDULE_DOCUMENT,
					) ],
				} ),
			],
			standfirst: "Everything that is on, day by day.",
			title: "Schedule",
		} ),

		// The same page on an event that never had a schedule uploaded.
		"/schedule-with-no-document": envelope( {
			main_region: [
				section( "The schedule", {
					content: [ session_schedule_list( SCHEDULE, null ) ],
				} ),
			],
			title: "Schedule with no document",
		}, { resolved_event: event( { schedule: null } ) } ),

		// Two sessions that agree about everything a category page can ask.
		// Every facet is dropped, so there is nothing to open — and the
		// trigger has to go with them.
		"/workshops": envelope( {
			main_region: [
				section( "Workshops — the listing", {
					content: [
						session_listing_with_filtration( "Workshop", [
							session_card( {
								category: "Workshop",
								name: "Repairing What You Own",
								price: 0,
							} ),
							session_card( {
								category: "Workshop",
								name: "Block Printing",
								price: 0,
							} ),
						] ),
					],
				} ),
			],
			title: "Workshops",
		} ),

		"/showcases": envelope( {
			main_region: [
				section( "Showcases — the listing", {
					content: [ session_listing_with_filtration(
						"Showcase",
						SHOWCASES,
					) ],
				} ),
			],
			standfirst: "Installations and concept designs across four days.",
			title: "Showcases",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

async function body ( path: string ) {
	const { html, status } = await website.get( path )

	expect( status ).toBe( 200 )

	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}

describe("a category listing page", () => {
	// The cap is ten everywhere else in the catalogue. Twelve cards is the
	// whole point of this component existing separately from the home page's
	// category rows.
	it("draws every session of the category, past the cap", async () => {
		const html = await body( "/showcases" )

		expect( html ).toContain( "Living with the Land" )
		expect( html ).toContain( "The Force Within" )

		for ( let at = 1; at <= 10; at++ ) {
			expect( html ).toContain( `Site Notes ${at}` )
		}
	})

	// A session is an "Event" everywhere the public reads it, so that is what
	// is counted — the static site says "Entries" here and "Events" on the
	// schedule, which is the same thing under two names.
	it("says how many are showing", async () => {
		expect( await body( "/showcases" ) ).toContain( "12" )
		expect( await body( "/showcases" ) ).toContain( "Events" )
	})

	it("counts one in the singular", async () => {
		const html = await body( "/conversations" )

		expect( html ).toContain( ">1 Event<" )
		expect( html ).not.toContain( "Events" )
	})

	// **The category facet is dropped here**, because the page is already one
	// category and a facet with one answer is a question not worth asking. The
	// other three survive.
	it("offers every facet but the category", async () => {
		const html = await body( "/showcases" )

		expect( html ).toContain( "Dates" )
		expect( html ).toContain( "Age Groups" )
		expect( html ).toContain( "Event Types" )
		expect( html ).not.toContain( "Event Categories" )
	})

	// The days are the event's, not a hardcoded three in December — they are
	// derived from the days the loaded sessions actually run on, and a session
	// spanning four days puts all four on the list.
	it("names the days its own sessions run on", async () => {
		const html = await body( "/showcases" )

		expect( html ).toContain( "Day 1 (11th Dec)" )
		expect( html ).toContain( "Day 2 (12th Dec)" )
		expect( html ).toContain( "Day 3 (13th Dec)" )
		expect( html ).toContain( "Day 4 (14th Dec)" )
	})

	// Two of the twelve are free and ten are ticketed, so both options earn
	// their place. A facet whose every option matches something is a facet a
	// visitor can trust.
	it("offers only the options its own sessions answer to", async () => {
		const html = await body( "/showcases" )

		expect( html ).toContain( "Free Event" )
		expect( html ).toContain( "Ticketed Event" )
		expect( html ).toContain( "All Ages" )
		expect( html ).toContain( "Children" )
		expect( html ).toContain( "Adults" )
	})

	it("carries the trigger that opens the filters", async () => {
		expect( await body( "/showcases" ) ).toContain( "Filter" )
	})

	// **A trigger that opens nothing is worse than no trigger.** Where every
	// facet has been dropped there is no widget to show, so the button that
	// would have shown it is not drawn either — both answer the same question
	// from the same input.
	it("draws no trigger where there is nothing to filter by", async () => {
		const html = await body( "/workshops" )

		expect( html ).toContain( "Repairing What You Own" )
		expect( html ).not.toContain( "Dates" )
		expect( html ).not.toContain( "Age Groups" )
		expect( html ).not.toContain( "Event Types" )
		expect( html ).not.toContain( "Filter" )
	})

	// A facet that every loaded session answers the same way narrows nothing.
	// This page holds two experiences on one day, so the day facet is dropped.
	it("leaves out a facet with only one answer", async () => {
		const html = await body( "/experiences" )

		expect( html ).not.toContain( "Dates" )
		expect( html ).toContain( "Age Groups" )
	})
})

describe("the schedule page", () => {
	// One entry per **instance**: the workshop below runs twice, so four
	// entries come from three sessions.
	it("counts sittings rather than sessions", async () => {
		const html = await body( "/schedule" )

		expect( html ).toContain( "4" )
		expect( html ).toContain( "Events" )
	})

	it("lists every session of the event, whatever its category", async () => {
		const html = await body( "/schedule" )

		expect( html ).toContain( "Block Printing with Native Cotton" )
		expect( html ).toContain( "Reweaving the Ecosystem" )
		expect( html ).toContain( "Designing for Heat" )
	})

	// **This is where the category facet survives**, and it is the only page
	// that reads across all four.
	it("offers the category facet and no other", async () => {
		const html = await body( "/schedule" )

		expect( html ).toContain( "Event Categories" )
		expect( html ).toContain( "All Workshops" )
		expect( html ).toContain( "All Showcases" )
		expect( html ).toContain( "All Conversations" )
		expect( html ).not.toContain( "Age Groups" )
		expect( html ).not.toContain( "Event Types" )
	})

	it("links to the resolved event's schedule document", async () => {
		const html = await body( "/schedule" )

		expect( html ).toContain( SCHEDULE_DOCUMENT.url )
		expect( html ).toContain( "Download Schedule" )
	})

	// A link to a document nobody uploaded is worse than no link, so there is
	// no link at all rather than one pointing at nothing.
	it("draws no download link where the event has no document", async () => {
		const html = await body( "/schedule-with-no-document" )

		expect( html ).not.toContain( "Download Schedule" )
	})

	// The navigation header: one tab per day the programme runs on.
	it("carries a day tab for each day of the programme", async () => {
		const html = await body( "/schedule" )

		expect( html ).toContain( "Day 1" )
		expect( html ).toContain( "11th Dec" )
		expect( html ).toContain( "Day 2" )
		expect( html ).toContain( "12th Dec" )
		expect( html ).toContain( "Day 3" )
		expect( html ).toContain( "13th Dec" )
	})

	// Every entry is tagged with the day it falls on, which is what the
	// progress bar measures its boundaries from. Without it the bar has
	// nothing to divide.
	it("tags every entry with the day it falls on", async () => {
		const html = await body( "/schedule" )

		expect( html ).toContain( "data-day=\"2025-12-11\"" )
		expect( html ).toContain( "data-day=\"2025-12-12\"" )
		expect( html ).toContain( "data-day=\"2025-12-13\"" )
	})

	// The hours, where a card would show only the days — and "All day" where a
	// session says so, because a start time that does not mean anything
	// misleads a visitor deciding when to come.
	it("shows the hours, and says All day where a session has none", async () => {
		const html = await body( "/schedule" )

		expect( html ).toContain( "10:00" )
		expect( html ).toContain( "All day" )
	})

	it("carries the trigger that opens the filters", async () => {
		expect( await body( "/schedule" ) ).toContain( "Filter" )
	})
})

describe("the widget's own breakpoint", () => {
	// The static site gates auto-apply at 768 while the design's medium
	// breakpoint is 1024, so between those two widths its submit button is
	// hidden and nothing commits. The two copies of that number live in
	// different modules; this is what keeps them agreeing.
	it("is the design's medium breakpoint, not the static site's", () => {
		expect( FROM_THE_MEDIUM_BREAKPOINT ).toContain( screens.md )
		expect( FROM_THE_MEDIUM_BREAKPOINT ).not.toContain( "768" )
	})
})

describe("the schedule's day tabs", () => {
	// The static site's tabs all point at `#`, which is a link that silently
	// does nothing. Each of these points at the first entry of its own day, so
	// the id and the fragment have to be the same string — and they are the
	// same string because one function produces both.
	it("lands on the first entry of the day it names", async () => {
		const html = await body( "/schedule" )

		// React Router resolves a fragment-only `to` against the current
		// location, so the href reads `/schedule#day-…` rather than `#day-…`.
		const fragments = [ ...html.matchAll( /href="[^"]*#(day-[^"]+)"/g ) ]
			.map( ( match ) => match[1] )

		expect( fragments.length ).toBe( 3 )

		for ( const fragment of fragments ) {
			expect( html ).toContain( `id="${fragment}"` )
		}
	})
})
