
/**
 |
 | The component catalogue, driven over HTTP against a seeded database.
 |
 | The populate object mirrors the schema graph by hand, with no recursion, and
 | when it is wrong the response is not an error — it is a page with content
 | missing below whatever depth the object reached. The catalogue is where that
 | goes wrong at scale: twenty-two components in the section list, three of them
 | carrying regions of their own, and every one of them needs a branch by name.
 |
 | So these tests read a real response body and look for the bottom of the tree.
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

function find_block ( blocks: any[], name: string ): any {
	for ( const block of blocks ?? [] ) {
		if ( block?.__component === name ) {
			return block
		}

		const found = Array.isArray( block?.content )
			? find_block( block.content, name )
			: undefined

		if ( found ) {
			return found
		}
	}

	return undefined
}

describe("the deepest legal path in the render tree", () => {
	it("arrives intact: entry region, section, composite, leaf", async () => {
		const { body, status } = await cms.get( "/api/envelope?path=/home" )

		expect( status ).toBe( 200 )

		const stack = find_block(
			body.data.entry.main_region,
			"container.image-stack-and-content-v1",
		)

		// Zone one is the entry's main region; zone two is the section's
		// content; zone three is the composite's. Below that is a leaf, and
		// nothing may carry a fourth.
		expect( stack ).toBeDefined()
		expect( stack.layout ).toBe( "images-left" )
		expect( stack.content.map( ( block: any ) => block.__component ) )
			.toEqual( [
				"text.heading-v1",
				"text.plain-string-v1",
				"text.plain-string-v1",
			] )
		expect( stack.content[0].content ).toBe( "Reclaiming Cool" )
	})

	it("reaches a picture four component levels below the section", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const feed = find_block(
			body.data.entry.main_region,
			"media.instagram-feed-v1",
		)

		// Feed → slide → responsive image → image → url. Every one of those is
		// a populate branch, and a missing one is a strip of blank boxes.
		expect( feed.slides.length ).toBeGreaterThan( 0 )
		expect( feed.slides[0].image.small.url ).toMatch( /^https:\/\// )
	})
})

describe("a repeatable component list", () => {
	it("arrives as raw data, with no discriminator to mistake for a region", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const marquee = find_block(
			body.data.entry.main_region,
			"text.marquee-v1",
		)

		expect( marquee.items.length ).toBe( 3 )
		expect( marquee.items[0].content ).toContain( "Pirojshanagar" )
		// This is the whole point: a member of a repeatable list carries no
		// `__component`, which is what keeps the renderer from walking into it
		// as though it were a region.
		expect( marquee.items[0].__component ).toBeUndefined()
	})

	it("populates a nested picture inside each member", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const sponsors = find_block(
			body.data.entry.main_region,
			"list.sponsors-list-v1",
		)

		expect( sponsors.sponsors.length ).toBe( 3 )
		expect( sponsors.sponsors[0].name ).toBe( "Laika" )
		expect( sponsors.sponsors[0].image.url ).toMatch( /^https:\/\// )
	})
})

describe("a section", () => {
	it("carries its backgrounds, its rule and its opening line", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		const section = body.data.entry.main_region.find( (
			block: any,
		) => block.title === "About Godrej Design Lab" )

		expect( section.opening_line ).toContain( "How the Lab supports" )
		expect( section.horizontal_rule ).toBe( true )
		expect( section.background_gradient ).toBe( "none" )
		expect( section.background_pattern ).toBe( "none" )
	})

	it("carries the background an editor chose", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const section = body.data.entry.main_region.find( (
			block: any,
		) => block.title === "Reclaiming Cool" )

		expect( section.background_gradient ).toBe( "white-to-light" )
		expect( section.background_pattern ).toBe( "spider-web-1" )
		expect( section.background_position ).toBe( "left" )
	})
})

describe("the composites", () => {
	it("populate an image and its region together", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		const composite = find_block(
			body.data.entry.main_region,
			"container.image-and-content-v1",
		)

		expect( composite.image.title ).toContain( "Nyrika Holkar" )
		expect( composite.content[1].__component ).toBe( "text.wysiwyg-v1" )
		// The rich text attribute is `rich_text` rather than `content`, so that
		// `content` means a region everywhere in the catalogue.
		expect( composite.content[1].rich_text[0].children[0].text )
			.toContain( "Godrej Design Lab is an initiative" )
		expect( composite.content[1].content ).toBeUndefined()
	})

	it("populate a map and its region together", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		const composite = find_block(
			body.data.entry.main_region,
			"container.map-and-content-v1",
		)

		expect( composite.map.map_url ).toBe(
			"https://example.com/maps/plant-13",
		)
		expect( composite.map.image.small.url ).toContain( "sketch-map" )
		expect( composite.content[0].__component ).toBe(
			"text.plain-string-v1",
		)
	})
})

describe("the page shell's injected code", () => {
	it("arrives with its three regions populated", async () => {
		const { body } = await cms.get( "/api/envelope?path=/archive-2023" )

		const hooks = body.data.page_shell.arbitrary_code

		expect( hooks.before_head_closing.length ).toBe( 1 )
		expect( hooks.before_head_closing[0].__component ).toBe(
			"code.script-v1",
		)
		expect( hooks.before_head_closing[0].code ).toContain(
			"__seeded_hook",
		)
		expect( hooks.after_body_opening ).toEqual( [] )
		expect( hooks.before_body_closing ).toEqual( [] )
	})
})
