
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

function find_section ( blocks: any[], title: string ): any {
	return ( blocks ?? [] ).find( ( block: any ) => block?.title === title )
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

/**
 |
 | The Archive's timeline is the deepest thing in the catalogue, and it is deep
 | in a way nothing else is: a **repeatable component that carries a region**.
 |
 | The repeatable half is invisible to the renderer's region rules — an entry
 | carries no `__component` and arrives as raw data — while the region inside it
 | is walked like any other. So the path down is entry region, section, listing,
 | entry, region, composite, leaf, and two of those hops are not zones at all.
 | A populate object that missed one of them would answer with an entry that has
 | a name and a year and no snapshots, which reads as an edition nobody has
 | written up rather than as a failure.
 |
 */
describe("the archive timeline", () => {
	it("arrives with its entries, their pictures and their snapshots", async () => {
		const { body, status } = await cms.get(
			"/api/envelope?path=/archives",
		)

		expect( status ).toBe( 200 )

		const timeline = find_block(
			body.data.entry.main_region,
			"list.archive-timeline-listing-v1",
		)

		expect( timeline ).toBeDefined()
		expect( timeline.entries.length ).toBeGreaterThan( 1 )

		const newest = timeline.entries[0]

		expect( newest.name ).toBe( "Reclaiming Cool" )
		expect( newest.year ).toBe( "2025" )
		expect( newest.description ).toEqual( expect.any( String ) )

		// Exactly three, because the fan on the timeline is three and the
		// schema says so. A shorter list is a gap in the design.
		expect( newest.featured_images ).toHaveLength( 3 )
		expect( newest.featured_images[0].url ).toMatch( /^https:\/\// )

		// An entry carries no discriminator of its own — it is a repeatable
		// component, not a member of a zone — while everything in its region
		// does.
		expect( newest.__component ).toBeUndefined()
		expect( newest.content.map( ( block: any ) => block.__component ) )
			.toEqual( [
				"text.wysiwyg-v1",
				"media.responsive-image-v1",
				"container.image-and-content-v1",
				"media.responsive-image-v1",
				"container.image-and-content-v1",
				"media.gallery-v1",
				"text.quote-v1",
			] )
	})

	it("reaches the fourth zone, inside a composite inside an entry", async () => {
		const { body } = await cms.get( "/api/envelope?path=/archives" )

		const timeline = find_block(
			body.data.entry.main_region,
			"list.archive-timeline-listing-v1",
		)

		const composite = timeline.entries[0].content.find( (
			block: any,
		) => block.__component === "container.image-and-content-v1" )

		// Zone four. Its own region is the inner list, whose members carry no
		// region at all, which is what stops the walk here.
		expect( composite.image.url ).toMatch( /^https:\/\// )
		expect( composite.content.map( ( block: any ) => block.__component ) )
			.toEqual( [ "text.wysiwyg-v1" ] )
		expect( composite.content[0].rich_text.length ).toBeGreaterThan( 0 )
	})

	it("leaves an entry nobody has written up with an empty region", async () => {
		const { body } = await cms.get( "/api/envelope?path=/archives" )

		const timeline = find_block(
			body.data.entry.main_region,
			"list.archive-timeline-listing-v1",
		)

		// Every entry but the newest. An empty region is the ordinary state of
		// a past edition, not an error, and the block that draws the timeline
		// has to answer for it — no button, and nothing to open.
		for ( const entry of timeline.entries.slice( 1 ) ) {
			expect( entry.content ).toEqual( [] )
			expect( entry.featured_images ).toHaveLength( 3 )
		}
	})
})

describe("the archive carousel", () => {
	it("arrives with its slides, each one an image link", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const ring = find_block(
			body.data.entry.main_region,
			"list.archive-carousel-listing-v1",
		)

		expect( ring ).toBeDefined()
		expect( ring.slides.length ).toBeGreaterThan( 0 )

		// Ring → slide → responsive image → image → url, the same four hops
		// the Instagram feed makes. The label is what is written under the
		// slide in the middle, so it is not decoration here.
		expect( ring.slides[0].label ).toEqual( expect.any( String ) )
		expect( ring.slides[0].url ).toBe( "/archives" )
		expect( ring.slides[0].image.small.url ).toMatch( /^https:\/\// )
	})
})

describe("spacing around a block", () => {
	it("travels with the block that carries it", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const marquee = find_block(
			body.data.entry.main_region,
			"text.marquee-v1",
		)

		// A scalar on the component, not a rule the website infers from what
		// kind of block this is. The home page's ticker asks for none, which
		// is what has it butting against its neighbours.
		expect( marquee.spacing_around ).toBe( "none" )
	})

	it("falls back to the schema's own default where nobody set it", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const bled = find_block(
			body.data.entry.main_region,
			"media.full-bleed-image-v1",
		)

		expect( bled.spacing_around ).toBe( "normal" )
	})

	it("is what the schedule page's list uses to open flush", async () => {
		const { body } = await cms.get( "/api/envelope?path=/schedule" )

		const list = find_block(
			body.data.entry.main_region,
			"list.session-schedule-list-v1",
		)

		expect( list.spacing_around ).toBe( "below" )
	})
})

describe("what a card does when it is pointed at", () => {
	it("travels with the listing that carries it", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const conversations = find_section(
			body.data.entry.main_region,
			"Conversations",
		)

		// A scalar on the listing, not something the website infers from the
		// category. The home page's conversations row is the one seeded onto
		// the treatment that is not the default.
		expect(
			find_block( conversations.content, "list.session-listing-v1" )
				.style_and_transition,
		)
			.toBe( "change-fill-on-hover" )
	})

	it("falls back to the schema's own default where nobody chose", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const showcases = find_section(
			body.data.entry.main_region,
			"Showcases",
		)

		expect(
			find_block( showcases.content, "list.session-listing-v1" )
				.style_and_transition,
		)
			.toBe( "change-stroke-on-hover" )
	})

	// The three card listings share one attribute, and the way that goes wrong
	// is that two of them get it and the third quietly does not. So all three
	// are named here, and the other two by the component an editor would have
	// to place to meet them.
	it("is on the category listing page's listing too", async () => {
		const { body } = await cms.get( "/api/envelope?path=/showcases" )

		const listing = find_block(
			body.data.entry.main_region,
			"list.session-listing-with-filtration-v1",
		)

		expect( listing.style_and_transition ).toBe(
			"change-stroke-on-hover",
		)
	})

	it("is on the curated list at the foot of a session too", async () => {
		const { body } = await cms.get(
			"/api/envelope?path=/sessions/repairing-what-you-own",
		)

		const list = find_block(
			body.data.entry.main_region,
			"list.session-list-v1",
		)

		expect( list.style_and_transition ).toBe( "change-stroke-on-hover" )
	})
})

describe("the colour of a block's words", () => {
	it("travels with the component that carries it", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		const showcases = find_section(
			body.data.entry.main_region,
			"Showcases",
		)

		// The section's heading and its link each carry their own, because the
		// colour belongs to the words rather than to the background behind
		// them.
		expect( showcases.heading.text_color ).toBe( "white" )
		expect( showcases.link.text_color ).toBe( "white" )
	})

	it("is each component's own default where nobody picked one", async () => {
		const { body } = await cms.get( "/api/envelope?path=/home" )

		// The blocks inside the image stack and the site navigation's links,
		// none of which names a colour. Not a section of the home page — every
		// one of those names one now, so none of them is a witness to what an
		// unset attribute does.
		const heading = find_block(
			body.data.entry.main_region,
			"text.heading-v1",
		)
		const plain = find_block(
			body.data.entry.main_region,
			"text.plain-string-v1",
		)

		// The four never shared a colour, so the defaults do not either: a
		// heading and a link have always drawn themselves in the page's own
		// colour, and prose in black.
		expect( heading.text_color ).toBe( "context" )
		expect( plain.text_color ).toBe( "black" )
		expect( body.data.page_shell.navigation_header[0].text_color )
			.toBe( "context" )
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

		// Every member, rather than the first one and a count: the claim is
		// that the populate reaches the picture inside each of them, and a
		// count would fail the next time somebody adds a logo without telling
		// anyone anything about whether the populate still reaches.
		expect( sponsors.sponsors.length ).toBeGreaterThan( 1 )

		for ( const sponsor of sponsors.sponsors ) {
			expect( sponsor.name ).toBeTruthy()
			expect( sponsor.image.url ).toMatch( /^https:\/\// )
		}
	})
})

describe("a section", () => {
	it("carries its backgrounds, its rule and its opening line", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		const section = body.data.entry.main_region.find( (
			block: any,
		) => block.title === "About Godrej Design Lab" )

		expect( section.opening_line.content ).toContain(
			"How the Lab supports",
		)
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

		expect( composite.map.place_url ).toContain( "google.com/maps/place" )
		// Derived on the way in, and the pin rather than the viewport: the
		// seed's URL also carries `@…,72.9200579`, 270 metres west of this.
		expect( composite.map.latitude ).toBe( 19.0939921 )
		expect( composite.map.longitude ).toBe( 72.9226328 )
		expect( composite.map.zoom ).toBe( 16 )
		expect( composite.map.image.url ).toContain( "sketch-map" )
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
