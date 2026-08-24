
/**
 |
 | Listings, over HTTP, against a seeded database.
 |
 | A listing is the one thing in this content model that arrives holding
 | something nobody wrote into it. Everywhere else, an empty response means an
 | editor left a field alone; here it can also mean a filter that matched
 | nothing, a splice that never ran, or a populate object that stopped one level
 | short. All three look identical from a page, which is exactly the failure the
 | seam exists to catch, so every assertion below is about what came back rather
 | than about how it was fetched.
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

const SESSION_LISTING = "list.session-listing-v1"
const SESSION_LIST = "list.session-list-v1"
const CONTRIBUTOR_LISTING = "list.contributor-listing-v1"

let cms: Seeded_Cms

beforeAll( async () => {
	cms = await boot_seeded_cms()
} )

afterAll( async () => {
	await cms?.destroy()
} )

/**
 |
 | Finds the listing nodes of one kind anywhere in an entry, by shape.
 |
 | The tests say what a listing holds, not where in the tree it sits, so that
 | moving a seeded section does not rewrite them.
 |
 */
function listings ( value: unknown, component: string ): any[] {
	if ( Array.isArray( value ) ) {
		return value.flatMap( ( item ) => listings( item, component ) )
	}

	if ( !value || typeof value !== "object" ) {
		return []
	}

	const node = value as Record<string, unknown>

	return [
		...( node.__component === component ? [ node ] : [] ),
		...Object.values( node ).flatMap( ( attribute ) =>
			listings( attribute, component )
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

describe("an auto-populated session listing", () => {
	it("arrives holding rows, which is not what the editor stored", async () => {
		const home = await entry( "/home" )

		const showcases = listings( home, SESSION_LISTING )
			.find( ( listing ) => listing.category === "Showcase" )

		expect( showcases ).toBeDefined()
		expect( showcases.sessions.length ).toBe( 6 )
	})

	it("holds only the category it names", async () => {
		const home = await entry( "/home" )

		for ( const listing of listings( home, SESSION_LISTING ) ) {
			for ( const session of listing.sessions ) {
				expect( session.category ).toBe( listing.category )
			}
		}
	})

	it("honours the count the editor asked for", async () => {
		const home = await entry( "/home" )

		const experiences = listings( home, SESSION_LISTING )
			.find( ( listing ) => listing.category === "Experience" )

		expect( experiences.count ).toBe( 3 )
		expect( experiences.sessions.length ).toBe( 3 )
	})

	// The seed holds twelve published Showcases in 2025 and two in 2027, so a
	// filter that had quietly stopped working would answer with ten here rather
	// than with two.
	it("is filtered to the event the page resolved to", async () => {
		const later = await entry( "/conscious-collective-2027" )

		const [ showcases ] = listings( later, SESSION_LISTING )

		expect( showcases.count ).toBe( 10 )
		expect( showcases.sessions.map( ( row: any ) => row.name ).sort() )
			.toEqual( [
				"Site Notes: The North Yard",
				"Site Notes: The Water Tank",
			] )
	})

	it("leaves the unpublished out, and lets draft preview in", async () => {
		const published = await entry( "/conscious-collective-2027" )
		const draft = await entry( "/conscious-collective-2027", "draft" )

		const names = ( page: unknown ) =>
			listings( page, SESSION_LISTING )[0].sessions
				.map( ( row: any ) => row.name )

		expect( names( published ) ).not.toContain( "Still Being Written" )
		expect( names( draft ) ).toContain( "Still Being Written" )
	})
})

describe("every row a listing pulls", () => {
	it("carries what a card is built from", async () => {
		const home = await entry( "/home" )

		const showcase = listings( home, SESSION_LISTING )
			.find( ( listing: any ) => listing.category === "Showcase" )
			.sessions
			.find( ( row: any ) => row.name === "Living with the Land" )

		expect( showcase ).toBeDefined()
		expect( showcase.category ).toBe( "Showcase" )
		expect( showcase.age_group ).toBe( "All" )
		expect( showcase.price ).toBe( 1599 )
		expect( showcase.session_date_first ).toBe( "2025-12-11" )
		expect( showcase.session_date_last ).toBe( "2025-12-14" )
		expect( showcase.standfirst ).toContain( "A two-part showcase" )
		expect( showcase.cover?.small?.url ).toBeTruthy()
		expect( showcase.contributors.map( ( person: any ) => person.name ) )
			.toEqual( [ "Debasmita Ghosh", "Arthur Mamou-Mani" ] )
	})

	// **The highest-leverage payload change available to this build.** A card
	// wants nine columns and a picture; an unnarrowed row carries the whole
	// region tree of a page nobody is looking at.
	it("carries nothing a card does not draw", async () => {
		const home = await entry( "/home" )

		for ( const listing of listings( home, SESSION_LISTING ) ) {
			for ( const session of listing.sessions ) {
				expect( session.main_region ).toBeUndefined()
				expect( session.instances ).toBeUndefined()
				// A card shows days, never hours, so the flag that hides the
				// hours has no reader either.
				expect( session.all_day_event ).toBeUndefined()
				expect( session.venue ).toBeUndefined()
				expect( session.checkout_url ).toBeUndefined()
			}
		}
	})

	// The URL is the one thing about a row that no populate branch can hand
	// over: it lives in webtools' alias table, behind a relation the content
	// API's sanitiser drops from everything it passes over.
	it("carries its own URL", async () => {
		const home = await entry( "/home" )

		for ( const listing of listings( home, SESSION_LISTING ) ) {
			for ( const session of listing.sessions ) {
				expect( session.path ).toMatch( /^\/sessions\// )
			}
		}
	})
})

describe("a curated session list", () => {
	it("holds the sessions an editor dragged in, in that order", async () => {
		const session = await entry( "/sessions/repairing-what-you-own" )

		const [ curated ] = listings( session, SESSION_LIST )

		expect( curated.sessions.map( ( row: any ) => row.name ) ).toEqual( [
			"Designing for Heat",
			"Living with the Land",
			"Block Printing with Native Cotton",
		] )
	})

	// The whole point of resolving both kinds in one place: a block cannot tell
	// them apart, so it has one code path rather than two.
	it("arrives in the same shape an automatic one does", async () => {
		const session = await entry( "/sessions/repairing-what-you-own" )
		const home = await entry( "/home" )

		const [ curated ] = listings( session, SESSION_LIST )
		const automatic = listings( home, SESSION_LISTING )[0]

		expect( Object.keys( curated.sessions[0] ).sort() )
			.toEqual( Object.keys( automatic.sessions[0] ).sort() )
	})
})

describe("a contributor listing", () => {
	it("fills itself from the event when it is left empty", async () => {
		const collaborators = await entry( "/collaborators" )

		const [ listing ] = listings( collaborators, CONTRIBUTOR_LISTING )

		expect( listing.layout ).toBe( "grid" )
		expect( listing.contributors.length ).toBeGreaterThan( 0 )

		const names = listing.contributors.map( ( row: any ) => row.name )

		// Kaveri Nair belongs to 2027 only, and Iris Han to no event at all,
		// because the one session that names her has never been published.
		expect( names ).not.toContain( "Kaveri Nair" )
		expect( names ).not.toContain( "Iris Han" )
	})

	it("holds the people an editor picked when it is not", async () => {
		const about = await entry( "/about" )

		const [ listing ] = listings( about, CONTRIBUTOR_LISTING )

		expect( listing.layout ).toBe( "natural" )
		expect( listing.contributors.map( ( row: any ) => row.name ) )
			.toEqual( [
				"Arthur Mamou-Mani",
				"Debasmita Ghosh",
				// Curated, so the event filter does not apply — this is a 2027
				// person on a page belonging to 2025.
				"Kaveri Nair",
			] )
	})

	it("narrows its rows and carries their URLs", async () => {
		const collaborators = await entry( "/collaborators" )

		const [ listing ] = listings( collaborators, CONTRIBUTOR_LISTING )

		for ( const person of listing.contributors ) {
			expect( person.name ).toBeTruthy()
			expect( person.path ).toMatch( /^\/collaborators\// )
			expect( person.image?.url ).toBeTruthy()
			expect( person.blurb ).toBeUndefined()
		}
	})
})
