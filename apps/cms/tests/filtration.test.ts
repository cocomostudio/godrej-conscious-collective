
/**
 |
 | The two unbounded listings, over HTTP, against a seeded database.
 |
 | Every other listing in this content model is capped at ten, and the cap is
 | what makes an empty-looking row obviously wrong. These two are the exception
 | the spec carves out: a category listing page shows **all** of its category
 | and the schedule shows **all** of the event, because both filter client-side
 | and both need the whole set in the browser to do it.
 |
 | That exception is exactly what a test has to hold. A cap that was never
 | lifted answers ten rows, which looks like a full page rather than like a
 | fault — so every count below is read off the seed and is deliberately larger
 | than ten.
 |
 */

import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
} from "vitest"

import {
	type Seeded_Cms,
	boot_seeded_cms,
} from "./support/boot-seeded-cms.ts"

const FILTRATION_LISTING = "list.session-listing-with-filtration-v1"
const SCHEDULE_LIST = "list.session-schedule-list-v1"

let cms: Seeded_Cms

beforeAll( async () => {
	cms = await boot_seeded_cms()
} )

afterAll( async () => {
	await cms?.destroy()
} )

/**
 |
 | Finds the component nodes of one kind anywhere in an entry, by shape — the
 | same walk `listings.test.ts` makes, and for the same reason: these tests say
 | what a listing holds rather than where in the tree it sits, so moving a
 | seeded section does not rewrite them.
 |
 */
function nodes ( value: unknown, component: string ): any[] {
	if ( Array.isArray( value ) ) {
		return value.flatMap( ( item ) => nodes( item, component ) )
	}

	if ( !value || typeof value !== "object" ) {
		return []
	}

	const node = value as Record<string, unknown>

	return [
		...( node.__component === component ? [ node ] : [] ),
		...Object.values( node ).flatMap( ( attribute ) =>
			nodes( attribute, component )
		),
	]
}

async function entry ( path: string, status = "published" ) {
	const { body, status: code } = await cms.get(
		`/api/envelope?path=${path}&status=${status}`,
	)

	expect( code ).toBe( 200 )

	return body.data.entry
}

describe("a session listing with filtration", () => {
	// Twelve published Showcases belong to 2025 in the seed. The number is
	// above ten on purpose: ten is what a listing that kept the cap would
	// answer, and ten Showcases on a page of Showcases reads as a full page.
	it("shows every session of its category, past the cap", async () => {
		const showcases = await entry( "/showcases" )

		const [ listing ] = nodes( showcases, FILTRATION_LISTING )

		expect( listing ).toBeDefined()
		expect( listing.category ).toBe( "Showcase" )
		expect( listing.sessions.length ).toBe( 12 )
	})
})

describe("a session schedule list", () => {
	// Forty published sessions belong to 2025 in the seed, across all four
	// categories. The schedule is the one listing that reads across the
	// categories rather than within one, and forty is four times the cap.
	it("holds every session of the event, whatever its category", async () => {
		const schedule = await entry( "/schedule" )

		const [ list ] = nodes( schedule, SCHEDULE_LIST )

		expect( list ).toBeDefined()
		expect( list.sessions.length ).toBe( 40 )

		const categories = new Set(
			list.sessions.map( ( row: any ) => row.category ),
		)

		expect( [ ...categories ].sort() ).toEqual( [
			"Conversation",
			"Experience",
			"Showcase",
			"Workshop",
		] )
	})

	// **A schedule row is not a card's row.** A card shows days and never
	// hours, so ticket 08 narrowed the instances out of it; the schedule is
	// read hour by hour, so they come back — and the flag that hides them
	// comes with them, because a row that says "All day" needs to know it.
	it("carries the hours, which a card's rows do not", async () => {
		const schedule = await entry( "/schedule" )

		const [ list ] = nodes( schedule, SCHEDULE_LIST )

		for ( const row of list.sessions ) {
			expect( Array.isArray( row.instances ) ).toBe( true )
			expect( row.instances.length ).toBeGreaterThan( 0 )
			expect( typeof row.all_day_event ).toBe( "boolean" )

			for ( const instance of row.instances ) {
				expect( instance.time_start ).toBeTruthy()
			}
		}
	})

	// It is narrowed everywhere else, exactly as a card's row is: a schedule
	// entry draws a picture, a name, a line and three points, and the region
	// tree of forty sessions is the largest payload this build could ship by
	// accident.
	it("carries nothing the schedule does not draw", async () => {
		const schedule = await entry( "/schedule" )

		const [ list ] = nodes( schedule, SCHEDULE_LIST )

		for ( const row of list.sessions ) {
			expect( row.main_region ).toBeUndefined()
			expect( row.venue ).toBeUndefined()
			expect( row.checkout_url ).toBeUndefined()
			expect( row.path ).toMatch( /^\/sessions\// )
		}
	})

	// The download link's target. It is spliced onto the node beside the rows,
	// for the reason the rows themselves are: the block then holds everything
	// it draws and needs nothing passed down to it from the page.
	it("carries the resolved event's schedule document", async () => {
		const schedule = await entry( "/schedule" )

		const [ list ] = nodes( schedule, SCHEDULE_LIST )

		expect( list.schedule?.url ).toMatch( /\.pdf$/ )
		expect( list.schedule?.name ).toContain( "2025" )
	})

	// The same component on a page belonging to the event that is **not**
	// main: thirteen sessions rather than forty, and 2027's schedule document
	// rather than 2025's. One page, both rules.
	it("follows the event the page resolved to, not the main one", async () => {
		const later = await entry( "/conscious-collective-2027" )

		const [ list ] = nodes( later, SCHEDULE_LIST )

		expect( list.sessions.length ).toBe( 13 )
		expect( list.schedule?.name ).toContain( "2027" )
	})
})
