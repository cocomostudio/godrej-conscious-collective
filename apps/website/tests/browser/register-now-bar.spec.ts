/**
 |
 | The Register Now bar at the foot of the screen, below the medium breakpoint,
 | measured in a browser.
 |
 | It stays out of sight until the bottom of the screen has passed two screens'
 | depth into the page, and goes out of sight again above that line. A page too
 | short to reach that line shows it all the time.
 |
 */

import {
	type Page,
	expect,
	test,
} from "@playwright/test"

import {
	CATEGORY_PATH,
	SHORT_PATH,
} from "./pages.ts"
import { open_page } from "./open-page.ts"
import { sample_every_frame } from "./sample-every-frame.ts"
import { scroll_by } from "./scroll.ts"

test( "stays out of sight near the top of a long page", { tag: "@sm" }, async ( { page } ) => {
	await open_page( page, CATEGORY_PATH )

	// The bar renders only once the page has hydrated, which on a server that
	// has just started can take longer than the default wait.
	await expect( register_now( page ) ).toBeAttached( { timeout: 20_000 } )
	await expect( register_now( page ) ).toBeHidden()
} )

test( "comes into sight once the bottom of the screen passes two screens down", { tag: "@sm" }, async ( { page } ) => {
	await open_page( page, CATEGORY_PATH )
	await scroll_to_the_line( page )

	await expect( register_now( page ) ).toBeVisible()
} )

test( "goes out of sight again above that line", { tag: "@sm" }, async ( { page } ) => {
	await open_page( page, CATEGORY_PATH )
	await scroll_to_the_line( page )
	await expect( register_now( page ) ).toBeVisible()

	await scroll_by( page, -100 )

	await expect( register_now( page ) ).toBeHidden()
} )

test( "fades in once, without flickering, while the reader keeps scrolling", { tag: "@sm" }, async ( { page } ) => {
	await open_page( page, CATEGORY_PATH )
	await expect( register_now( page ) ).toBeAttached( { timeout: 20_000 } )
	await scroll_by( page, page.viewportSize()!.height - 100 )

	const opacities = await sample_every_frame( page, async () => {
		for ( let step = 0; step < 10; step++ ) {
			await scroll_by( page, 20 )
		}
	}, () => Number( getComputedStyle(
		document.querySelector( ".register-now-bar__reveal" )!,
	).opacity ) )

	for ( let index = 1; index < opacities.length; index++ ) {
		expect( opacities[index] ).toBeGreaterThanOrEqual( opacities[index - 1] )
	}
	expect( opacities.at( -1 ) ).toBe( 1 )
} )

test( "stays in sight while the reader scrolls up below the line", { tag: "@sm" }, async ( { page } ) => {
	await open_page( page, CATEGORY_PATH )
	await scroll_by( page, page.viewportSize()!.height * 2 )
	await expect( register_now( page ) ).toBeVisible()

	await scroll_by( page, -300 )
	await page.waitForTimeout( 300 )

	await expect( register_now( page ) ).toBeVisible()
} )

test( "stays in sight above the line after upward movements shorter than 64px", { tag: "@sm" }, async ( { page } ) => {
	await open_page( page, CATEGORY_PATH )
	await scroll_to_the_line( page )
	await scroll_by( page, 10 )
	await expect( register_now( page ) ).toBeVisible()

	await scroll_by( page, -40 )
	await page.waitForTimeout( 300 )
	await scroll_by( page, -40 )
	await page.waitForTimeout( 300 )

	await expect( register_now( page ) ).toBeVisible()
} )

test( "counts an upward movement from where it starts, below the line too", { tag: "@sm" }, async ( { page } ) => {
	await open_page( page, CATEGORY_PATH )
	await scroll_to_the_line( page )
	await scroll_by( page, 50 )
	await expect( register_now( page ) ).toBeVisible()
	await page.waitForTimeout( 300 )

	// 70px up in one movement, ending 20px above the line.
	await scroll_by( page, -70 )

	await expect( register_now( page ) ).toBeHidden()
} )

test( "stays in sight on a page shorter than two screens", { tag: "@sm" }, async ( { page } ) => {
	await open_page( page, SHORT_PATH )

	// A page that scrolls a little, rather than one that cannot scroll at all.
	const { screen, tall } = await page.evaluate( () => ( {
		screen: window.innerHeight,
		tall: document.documentElement.scrollHeight,
	} ) )
	expect( tall ).toBeGreaterThan( screen )
	expect( tall ).toBeLessThan( screen * 2 )

	await expect( register_now( page ) ).toBeVisible()
} )

/** Found while out of sight too, where it has left the accessibility tree. */
function register_now ( page: Page ) {
	return page.getByRole( "button", { includeHidden: true, name: /^RSVP/ } )
}

/** One screen down, which puts the bottom of the screen two screens down. */
async function scroll_to_the_line ( page: Page ) {
	await scroll_by( page, page.viewportSize()!.height )
}
