
/**
 |
 | The envelope route, driven over HTTP against a seeded database.
 |
 | The first test here is the most valuable one in the suite, and it is the
 | reason the seam is HTTP: the populate object is written by hand and mirrors
 | the schema graph with no recursion, so when it is wrong the response is not an
 | error — it is a page with content missing below whatever depth the object
 | reached. Only a response body shows that.
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

let cms: Seeded_Cms

beforeAll( async () => {
	cms = await boot_seeded_cms()
} )

afterAll( async () => {
	await cms?.destroy()
} )

describe("the deepest legal path in the render tree", () => {
	it("arrives intact: entry region, section, leaf", async () => {
		const { body, status } = await cms.get( "/api/envelope?path=/home" )

		expect( status ).toBe( 200 )

		const sections = body.data.entry.main_region

		expect( sections.length ).toBeGreaterThan( 0 )
		expect( sections[0].__component ).toBe( "container.section-v1" )
		expect( sections[0].title ).toBe( "Above the Fold" )

		// One level deeper: the leaf inside the section's content zone — a
		// full-bleed image with three crops of the same photograph. It holds
		// what a responsive image holds and shares that component's populate
		// fragment, so reaching `small.url` through it is the same proof at
		// the same depth.
		const leaves = sections[0].content

		expect( leaves.length ).toBe( 1 )
		expect( leaves[0].__component ).toBe( "media.full-bleed-image-v1" )
		expect( leaves[0].small.url ).toMatch( /^https?:\/\// )
		expect( leaves[0].spacing_around ).toBe( "normal" )
	})

	it("populates the side region's two components", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		expect(
			body.data.entry.side_region.map( ( block ) => block.__component ),
		).toEqual( [
			"text.heading-v1",
			"text.plain-string-v1",
		] )
	})
})

describe("the envelope", () => {
	it("carries the entry, the page shell and both event slots", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		expect( Object.keys( body.data ).sort() ).toEqual( [
			"entry",
			"main_event",
			"page_shell",
			"resolved_event",
		] )

		expect( body.data.entry.title ).toBe( "Home" )
		expect( body.data.entry.contentType ).toBe( "api::page.page" )
	})

	it("carries the page shell fully populated, not just its id", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )
		const shell = body.data.page_shell

		expect( shell.site_title ).toBe( "Godrej Conscious Collective" )
		expect( shell.navigation_header[0] ).toMatchObject( {
			label: "Showcases",
			style: "plain",
			url: "/showcases",
		} )
		expect( shell.navigation_footer.length ).toBe( 3 )
	})

	it("does not nest the page shell inside the entry", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		expect( body.data.entry.page_shell ).toBeUndefined()
	})
})

describe("paths", () => {
	it("resolves a page through the alias table, by its title", async () => {
		const { body, status } = await cms.get( "/api/envelope?path=/about" )

		expect( status ).toBe( 200 )
		expect( body.data.entry.title ).toBe( "About" )
	})

	it("does not resolve the root, because no page's pattern produces it", async () => {
		// The website's fallback to `/home` is what covers this, and it is
		// asserted at the website's own seam.
		const { status } = await cms.get( "/api/envelope?path=/" )

		expect( status ).toBe( 404 )
	})

	it("answers 404 for a path that resolves to nothing", async () => {
		const { status } = await cms.get( "/api/envelope?path=/no-such-page" )

		expect( status ).toBe( 404 )
	})

	it("refuses a path that is not absolute", async () => {
		const { status } = await cms.get( "/api/envelope?path=about" )

		expect( status ).toBe( 400 )
	})

	it("refuses a request with no path at all", async () => {
		const { status } = await cms.get( "/api/envelope" )

		expect( status ).toBe( 400 )
	})
})

describe("draft preview", () => {
	it("does not serve an unpublished page on the published path", async () => {
		const { status } = await cms.get( "/api/envelope?path=/unfinished" )

		expect( status ).toBe( 404 )
	})

	it("serves it when the status parameter asks for the draft", async () => {
		const { body, status } = await cms.get(
			"/api/envelope?path=/unfinished&status=draft",
		)

		expect( status ).toBe( 200 )
		expect( body.data.entry.title ).toBe( "Unfinished" )
	})

	it("refuses a status it does not recognise", async () => {
		const { status } = await cms.get(
			"/api/envelope?path=/about&status=whatever",
		)

		expect( status ).toBe( 400 )
	})
})

describe("sanitisation", () => {
	it("strips the hidden url_alias relation", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		expect( body.data.entry.url_alias ).toBeUndefined()
	})

	it("strips the creator fields Strapi keeps on every row", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		expect( body.data.entry.createdBy ).toBeUndefined()
		expect( body.data.entry.updatedBy ).toBeUndefined()
	})
})

describe("page layout", () => {
	it("carries the layout the editor chose", async () => {
		// The home page is the one-column page in the sample content: it is
		// the one the design draws full-width, and it has no back link or
		// table of contents to put in a sidebar.
		const two = await cms.get( "/api/envelope?path=/about" )
		const one = await cms.get( "/api/envelope?path=/home" )

		expect( two.body.data.entry.page_layout ).toBe( "two-column" )
		expect( one.body.data.entry.page_layout ).toBe( "one-column" )
	})

	it("carries the layout an editor chose explicitly, not only the default", async () => {
		const { body } = await cms.get(
			"/api/envelope?path=/legal-disclaimer",
		)

		expect( body.data.entry.page_layout ).toBe( "two-column" )
	})
})

/**
 |
 | Webtools' own resolver checks permissions **after** it looks a path up, so it
 | answers 403 for an entry that exists and 404 for one that does not — which
 | tells an unauthorised caller which paths are real. This route settles the
 | readable content types first, and both answers are then the same.
 |
 */
describe("an unauthorised caller", () => {
	beforeAll( async () => {
		await set_public_permission( "api::page.page.find", false )
	} )

	afterAll( async () => {
		await set_public_permission( "api::page.page.find", true )
	} )

	it("cannot tell a real path from an invented one", async () => {
		const real = await cms.get( "/api/envelope?path=/about" )
		const invented = await cms.get( "/api/envelope?path=/no-such-page" )

		expect( real.status ).toBe( invented.status )
		expect( real.body ).toEqual( invented.body )
	})
})

async function set_public_permission ( action: string, granted: boolean ) {
	const permissions = cms.strapi.db.query(
		"plugin::users-permissions.permission",
	)
	const role = await cms.strapi.db
		.query( "plugin::users-permissions.role" )
		.findOne( { where: { type: "public" } } )

	if ( granted ) {
		const existing = await permissions.findOne( {
			where: { action, role: role.id },
		} )

		if ( !existing ) {
			await permissions.create( { data: { action, role: role.id } } )
		}

		return
	}

	await permissions.delete( { where: { action, role: role.id } } )
}
