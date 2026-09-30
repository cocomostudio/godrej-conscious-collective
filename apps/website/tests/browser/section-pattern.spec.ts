
/**
 |
 | A section's spider web, measured in a browser.
 |
 | The web is 728.8 × 960.8 pixels. An editor places it against a corner or an
 | edge, and then turns it about its own centre, so a quarter turn keeps its
 | centre where the unturned web's centre was and swaps its width for its
 | height. Whatever spills past the section is cut off, so the page never
 | scrolls sideways to reach it.
 |
 */

import {
	type Locator,
	type Page,
	expect,
	test,
} from "@playwright/test"

import {
	PLAIN_PATTERN_PATH,
	TURNED_PATTERN_PATH,
} from "./pages.ts"

const WIDTH = 728.8
const HEIGHT = 960.8

test( "turns the web about its own centre, from the corner it was placed in", { tag: "@lg" }, async ( { page } ) => {
	await page.goto( TURNED_PATTERN_PATH )

	await expect( async () => {
		const section = await box_of( section_of( page ) )
		const web = await box_of( web_of( page ) )

		// Unturned, the web's top-right corner is the section's.
		expect( web.centre_x ).toBeCloseTo( section.right - ( WIDTH / 2 ), 0 )
		expect( web.centre_y ).toBeCloseTo( section.top + ( HEIGHT / 2 ), 0 )

		expect( web.width ).toBeCloseTo( HEIGHT, 0 )
		expect( web.height ).toBeCloseTo( WIDTH, 0 )
	} ).toPass()
} )

test( "sits an unplaced web against the left edge, halfway down, unturned", { tag: "@lg" }, async ( { page } ) => {
	await page.goto( PLAIN_PATTERN_PATH )

	await expect( async () => {
		const section = await box_of( section_of( page ) )
		const web = await box_of( web_of( page ) )

		expect( web.left ).toBeCloseTo( section.left, 0 )
		expect( web.centre_y ).toBeCloseTo( section.top + ( section.height / 2 ), 0 )
		expect( web.width ).toBeCloseTo( WIDTH, 0 )
		expect( web.height ).toBeCloseTo( HEIGHT, 0 )
	} ).toPass()
} )

test( "cuts the web off at the section, so the page never scrolls sideways", { tag: "@sm" }, async ( { page } ) => {
	await page.goto( TURNED_PATTERN_PATH )

	await expect( async () => {
		const overflow = await page.evaluate( () =>
			document.documentElement.scrollWidth
			- document.documentElement.clientWidth
		)

		expect( overflow ).toBe( 0 )
	} ).toPass()
} )

function section_of ( page: Page ) {
	return page.locator( "section", { hasText: "Words over a spider web." } )
}

function web_of ( page: Page ) {
	return section_of( page ).locator( "svg[viewBox=\"0 0 728.8 960.8\"]" )
}

async function box_of ( locator: Locator ) {
	const box = await locator.boundingBox()

	if ( !box ) {
		throw new Error( "The element is not visible, so it has no box." )
	}

	return {
		centre_x: box.x + ( box.width / 2 ),
		centre_y: box.y + ( box.height / 2 ),
		height: box.height,
		left: box.x,
		right: box.x + box.width,
		top: box.y,
		width: box.width,
	}
}
