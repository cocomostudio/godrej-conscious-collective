
/**
 |
 | The Archive's timeline, measured in a browser.
 |
 | Below the large breakpoint the timeline is a strip a visitor scrolls
 | sideways; from it, a stack of entries on a spine. Every number asserted
 | here is the design's own — the gap between two entries, where the fan and
 | the node sit in an entry, how far the line reaches — measured off the page,
 | never read off the classes that produce it.
 |
 | Positions are compared with the entry's own box rather than with the page,
 | so that nothing above the timeline moves them. Every measurement is retried
 | until it holds, so a font or a photograph arriving late cannot fail a test
 | that would pass a moment later.
 |
 */

import {
	type Locator,
	type Page,
	expect,
	test,
} from "@playwright/test"

import {
	ARCHIVE_ENTRIES,
	BARE_SECTION_PATH,
	front_photograph_of,
} from "./pages.ts"

const [ FIRST, MIDDLE, LAST ] = ARCHIVE_ENTRIES

/** A 1×1 transparent PNG: the stub CMS's uploads are not reachable from a browser. */
const PIXEL = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
	"base64",
)

test.beforeEach( async ( { page } ) => {
	await page.route( "http://cms.test/**", ( route ) =>
		route.fulfill( { body: PIXEL, contentType: "image/png" } )
	)

	await page.goto( "/archives" )
	await page.evaluate( () => document.fonts.ready )
} )

test.describe( "in a section that pads neither edge", () => {
	for ( const tag of [ "@below-lg", "@lg" ] ) {
		test( `keeps 32px below the timeline (${tag})`, { tag }, async ( { page } ) => {
			await page.goto( BARE_SECTION_PATH )

			await expect( async () => {
				const section = await box_of( section_of( page ) )
				const block = await box_of( block_of( page ) )
				const timeline = await box_of( timeline_of( page ) )

				expect( block.bottom - timeline.bottom ).toBe( 32 )
				expect( section.bottom ).toBe( block.bottom )
			} ).toPass()
		} )
	}
} )

test.describe( "at the small breakpoint", () => {
	test( "keeps each entry wide enough for its fan, where three quarters of the screen is not", { tag: "@sm" }, async ( { page } ) => {
		const entry = entry_of( page, FIRST.year )

		await expect( async () => {
			const width = page.viewportSize()?.width ?? 0
			const entry_box = await box_of( entry )
			const fan = await box_of( entry.getByRole( "list" ) )

			expect( width * 0.75 ).toBeLessThan( fan.width )
			expect( fan.left ).toBeGreaterThanOrEqual( entry_box.left )
			expect( fan.right ).toBeLessThanOrEqual( entry_box.right )
		} ).toPass()
	} )
} )

test.describe( "below the large breakpoint", () => {
	test( "caps each entry at 400px wide", { tag: "@below-lg" }, async ( { page } ) => {
		await expect( async () => {
			const first = await entry_of( page, FIRST.year ).boundingBox()

			expect( first?.width ).toBe( 400 )
		} ).toPass()
	} )

	test( "opens the section with the count, 32px above the spine, and leaves the space below to the section", { tag: "@below-lg" }, async ( { page } ) => {
		await expect( async () => {
			const section = await box_of( section_of( page ) )
			const block = await box_of( block_of( page ) )
			const count = await box_of(
				page.getByText( "3 Events", { exact: true } ).locator( "xpath=.." ),
			)
			const timeline = await box_of( timeline_of( page ) )
			const first = await box_of( entry_of( page, FIRST.year ) )

			expect( block.top ).toBe( section.top )
			expect( count.top ).toBe( block.top )
			expect( first.top - count.bottom ).toBe( 32 )
			expect( block.bottom ).toBe( timeline.bottom )
			// The section's own bottom spacing, and nothing on top of it.
			expect( section.bottom - block.bottom ).toBe( 64 )
		} ).toPass()
	} )

	test( "stops the last entry's line at its node", { tag: "@below-lg" }, async ( { page } ) => {
		await expect( entry_of( page, LAST.year ).getByTestId( "spine-line" ) ).toBeHidden()
	} )

	test( "lays the entries out side by side", { tag: "@below-lg" }, async ( { page } ) => {
		await expect( async () => {
			const first = await box_of( entry_of( page, FIRST.year ) )
			const middle = await box_of( entry_of( page, MIDDLE.year ) )

			expect( middle.top ).toBe( first.top )
			expect( middle.left ).toBeGreaterThan( first.left )
		} ).toPass()
	} )

	test( "counts the events above the strip", { tag: "@below-lg" }, async ( { page } ) => {
		await expect( page.getByText( "3 Events", { exact: true } ) ).toBeVisible()
	} )
} )

test.describe( "from the large breakpoint", () => {
	test( "stacks the entries 32px apart", { tag: "@lg" }, async ( { page } ) => {
		await expect( async () => {
			const first = await box_of( entry_of( page, FIRST.year ) )
			const middle = await box_of( entry_of( page, MIDDLE.year ) )
			const last = await box_of( entry_of( page, LAST.year ) )

			expect( middle.top - first.bottom ).toBe( 32 )
			expect( last.top - middle.bottom ).toBe( 32 )
		} ).toPass()
	} )

	test( "does not count the events", { tag: "@lg" }, async ( { page } ) => {
		await expect( page.getByText( "3 Events", { exact: true } ) ).toBeHidden()
	} )

	test( "keeps 32px above the timeline, and leaves the space below to the section", { tag: "@lg" }, async ( { page } ) => {
		await expect( async () => {
			const section = await box_of( section_of( page ) )
			const block = await box_of( block_of( page ) )
			const timeline = await box_of( timeline_of( page ) )

			expect( block.top ).toBe( section.top )
			expect( timeline.top - block.top ).toBe( 32 )
			expect( block.bottom ).toBe( timeline.bottom )
			// The section's own bottom spacing, and nothing on top of it.
			expect( section.bottom - block.bottom ).toBe( 64 )
		} ).toPass()
	} )

	test( "keeps a further 32px above the first entry", { tag: "@lg" }, async ( { page } ) => {
		await expect( async () => {
			const timeline = await box_of( timeline_of( page ) )
			const first = await box_of( entry_of( page, FIRST.year ) )

			expect( first.top - timeline.top ).toBe( 32 )
		} ).toPass()
	} )

	test( "makes an entry 284px tall, with the front photograph 32px inside it", { tag: "@lg" }, async ( { page } ) => {
		const entry = entry_of( page, FIRST.year )

		await expect( async () => {
			const entry_box = await box_of( entry )
			const photograph = await box_of(
				entry.getByRole( "img", { name: front_photograph_of( FIRST.year ) } ),
			)

			expect( entry_box.height ).toBe( 284 )
			expect( photograph.height ).toBe( 220 )
			expect( photograph.top - entry_box.top ).toBe( 32 )
			expect( entry_box.bottom - photograph.bottom ).toBe( 32 )
		} ).toPass()
	} )

	test( "sets the edition's name 16px into the entry, and its last line at least 16px above the bottom", { tag: "@lg" }, async ( { page } ) => {
		const entry = entry_of( page, FIRST.year )

		await expect( async () => {
			const entry_box = await box_of( entry )
			const name = await box_of(
				entry.getByRole( "heading", { exact: true, name: FIRST.name } ),
			)
			const see_snapshots = await box_of( entry.getByRole( "button" ) )

			expect( name.top - entry_box.top ).toBe( 16 )
			expect( entry_box.bottom - see_snapshots.bottom ).toBeGreaterThanOrEqual( 16 )
		} ).toPass()
	} )

	test( "grows an entry with a long description, keeping 16px below its last line", { tag: "@lg" }, async ( { page } ) => {
		const entry = entry_of( page, MIDDLE.year )

		await expect( async () => {
			const entry_box = await box_of( entry )
			// The See Snapshots button is the last line under the description.
			const see_snapshots = await box_of( entry.getByRole( "button" ) )

			expect( entry_box.height ).toBeGreaterThan( 284 )
			expect( entry_box.bottom - see_snapshots.bottom ).toBe( 16 )
		} ).toPass()
	} )

	test( "pins the fan, the node and the year to the top of an entry that grew", { tag: "@lg" }, async ( { page } ) => {
		const entry = entry_of( page, MIDDLE.year )

		await expect( async () => {
			const entry_box = await box_of( entry )
			const photograph = await box_of(
				entry.getByRole( "img", { name: front_photograph_of( MIDDLE.year ) } ),
			)
			const node = await box_of( entry.getByTestId( "spine-node" ) )
			const year = await box_of(
				entry.getByRole( "heading", { exact: true, name: MIDDLE.year } ),
			)

			expect( photograph.top - entry_box.top ).toBe( 32 )
			expect( node.middle - entry_box.top ).toBe( 142 )
			expect( year.middle - entry_box.top ).toBe( 142 )
		} ).toPass()
	} )

	test( "runs each entry's line from 32px above the entry to its bottom edge", { tag: "@lg" }, async ( { page } ) => {
		await expect( async () => {
			for ( const { year } of [ FIRST, MIDDLE ] ) {
				const entry = entry_of( page, year )
				const entry_box = await box_of( entry )
				const line = await box_of( entry.getByTestId( "spine-line" ) )

				expect( entry_box.top - line.top ).toBe( 32 )
				expect( line.bottom ).toBe( entry_box.bottom )
			}
		} ).toPass()
	} )

	test( "stops the last entry's line at the centre of its node", { tag: "@lg" }, async ( { page } ) => {
		const entry = entry_of( page, LAST.year )

		await expect( async () => {
			const entry_box = await box_of( entry )
			const line = await box_of( entry.getByTestId( "spine-line" ) )
			const node = await box_of( entry.getByTestId( "spine-node" ) )

			expect( entry_box.top - line.top ).toBe( 32 )
			expect( line.bottom ).toBe( node.middle )
		} ).toPass()
	} )

	test( "fades the first entry's line out above the top of its node", { tag: "@lg" }, async ( { page } ) => {
		const entry = entry_of( page, FIRST.year )
		const line_locator = entry.getByTestId( "spine-line" )

		await expect( async () => {
			const line = await box_of( line_locator )
			const node = await box_of( entry.getByTestId( "spine-node" ) )

			const gradient = await line_locator.evaluate(
				( element ) => getComputedStyle( element ).backgroundImage,
			)

			// Transparent at the line's top, and solid from the node's top down.
			const [ , solid_from ] = gradient.match( /\)\s+(\d+(?:\.\d+)?)px\)$/ ) ?? []

			expect( gradient ).toMatch( /^linear-gradient\(rgba\(\d+, \d+, \d+, 0\)/ )
			expect( Number( solid_from ) ).toBe( node.top - line.top )
		} ).toPass()
	} )

	test( "moves the front photograph down 32px while the entry is pointed at", { tag: "@lg" }, async ( { page } ) => {
		const entry = entry_of( page, FIRST.year )
		const photograph = entry.getByRole( "img", { name: front_photograph_of( FIRST.year ) } )
		const at_rest = ( await box_of( photograph ) ).top

		await entry.hover()

		await expect.poll( async () => ( await box_of( photograph ) ).top - at_rest )
			.toBe( 32 )
	} )
} )

/** The entry for one edition, found by its year. */
function entry_of ( page: Page, year: string ) {
	return page.getByRole( "listitem" ).filter( {
		has: page.getByRole( "heading", { exact: true, name: year } ),
	} )
}

function timeline_of ( page: Page ) {
	return page.getByRole( "list" ).filter( {
		has: page.getByRole( "heading", { exact: true, name: FIRST.year } ),
	} )
}

/** The whole block — the count and the timeline — and the section around it. */
function block_of ( page: Page ) {
	return timeline_of( page ).locator( "xpath=.." )
}

function section_of ( page: Page ) {
	return timeline_of( page ).locator( "xpath=ancestor::section[1]" )
}

async function box_of ( locator: Locator ) {
	const box = await locator.boundingBox()

	if ( !box ) {
		throw new Error( "The element is not visible, so it has no box." )
	}

	return {
		bottom: box.y + box.height,
		height: box.height,
		left: box.x,
		middle: box.y + ( box.height / 2 ),
		right: box.x + box.width,
		top: box.y,
		width: box.width,
	}
}
