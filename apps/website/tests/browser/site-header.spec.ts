/**
 |
 | The site header and the sticky bars that make room for it, measured in a
 | browser.
 |
 | The site header scrolls away with the page. Past that, it slides back in
 | whenever the reader scrolls up, and slides away again when the reader scrolls
 | down. Every sticky bar further down the page sits flush under the site header
 | while it is showing, and at the top of the screen while it is not.
 |
 | Scrolling is done with the mouse wheel. See `scroll.ts`.
 |
 */

import {
	type Locator,
	type Page,
	expect,
	test,
} from "@playwright/test"

import {
	CATEGORY_PATH,
	SCHEDULE_PATH,
} from "./pages.ts"
import { open_page } from "./open-page.ts"
import { sample_every_frame } from "./sample-every-frame.ts"
import {
	scroll_by,
	scroll_down_two_screens,
} from "./scroll.ts"

const BOTH_WIDTHS = [ "@sm", "@lg" ]

test.describe( "the site header", () => {
	for ( const tag of BOTH_WIDTHS ) {
		test( `scrolls away with the page (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_by( page, 40 )

			await expect.poll( async () => ( await box_of( site_header( page ) ) ).top )
				.toBe( -40 )
		} )

		test( `slides in when the reader scrolls up (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_down_two_screens( page )
			await scroll_by( page, -100 )

			await expect.poll( async () => ( await box_of( site_header( page ) ) ).top )
				.toBe( 0 )
		} )

		test( `slides away again when the reader scrolls down (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_down_two_screens( page )
			await scroll_by( page, -100 )
			await expect.poll( async () => ( await box_of( site_header( page ) ) ).top )
				.toBe( 0 )

			await scroll_by( page, 100 )

			await expect.poll( async () => ( await box_of( site_header( page ) ) ).bottom )
				.toBeLessThanOrEqual( 0 )
		} )

		test( `ignores upward movements shorter than 64px (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_down_two_screens( page )
			await scroll_by( page, -40 )
			await page.waitForTimeout( 300 )
			await scroll_by( page, -40 )
			await page.waitForTimeout( 300 )

			expect( ( await box_of( site_header( page ) ) ).bottom ).toBeLessThanOrEqual( 0 )
		} )

		test( `does not slide in within the first screen (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_by( page, 300 )
			await scroll_by( page, -100 )
			await page.waitForTimeout( 300 )

			expect( ( await box_of( site_header( page ) ) ).bottom ).toBeLessThanOrEqual( 0 )
		} )

		test( `stays in sight on the way back up to the top (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_down_two_screens( page )
			await scroll_by( page, -100 )
			await expect.poll( async () => ( await box_of( site_header( page ) ) ).top )
				.toBe( 0 )

			const scrolled = await page.evaluate( () => window.scrollY )
			await scroll_by( page, 200 - scrolled )
			await page.waitForTimeout( 300 )

			expect( ( await box_of( site_header( page ) ) ).top ).toBe( 0 )
		} )

		test( `moves the listing's header in step with it (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_down_two_screens( page )

			const gaps = await sample_every_frame( page, () => scroll_by( page, -100 ), () => {
				const header = document.querySelector( "header" )!.getBoundingClientRect()
				const count = [ ...document.querySelectorAll( "p" ) ]
					.find( ( p ) => /^\d+ Events?$/.test( p.textContent ?? "" ) )!
				const listing = count.parentElement!.getBoundingClientRect()

				return listing.top - Math.max( 0, header.bottom )
			} )

			for ( const gap of gaps ) {
				expect( Math.abs( gap ) ).toBeLessThan( 1 )
			}
		} )

		test( `slides in while something inside it has focus (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_down_two_screens( page )

			await site_header( page ).getByRole( "link" ).first().evaluate(
				( element ) => ( element as HTMLElement ).focus( { preventScroll: true } ),
			)

			await expect.poll( async () => ( await box_of( site_header( page ) ) ).top )
				.toBe( 0 )
		} )
	}
} )

test.describe( "the category listing's header", () => {
	for ( const tag of BOTH_WIDTHS ) {
		test( `sticks to the top of the screen while the site header is away (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_down_two_screens( page )

			await expect.poll( async () => ( await box_of( listing_header( page ) ) ).top )
				.toBe( 0 )
		} )

		test( `sits directly under the site header while it is showing (${tag})`, { tag }, async ( { page } ) => {
			await open_page( page, CATEGORY_PATH )
			await scroll_down_two_screens( page )
			await scroll_by( page, -100 )

			await expect( async () => {
				const header = await box_of( site_header( page ) )
				const listing = await box_of( listing_header( page ) )

				expect( header.top ).toBe( 0 )
				expect( listing.top ).toBe( header.bottom )
			} ).toPass()
		} )
	}
} )

test.describe( "the schedule's list header and day navigation", () => {
	test( "leave the site header out of sight on a jump to a day", { tag: "@sm" }, async ( { page } ) => {
		await open_page( page, SCHEDULE_PATH )
		await scroll_down_two_screens( page )
		await scroll_down_two_screens( page )

		await day_navigation( page ).getByRole( "link" ).first().click()
		await page.waitForTimeout( 500 )

		expect( ( await box_of( site_header( page ) ) ).bottom ).toBeLessThanOrEqual( 0 )
	} )

	test( "stack the list header above the day navigation, below the medium breakpoint", { tag: "@sm" }, async ( { page } ) => {
		await open_page( page, SCHEDULE_PATH )
		await scroll_down_two_screens( page )

		await expect( async () => {
			const list = await box_of( schedule_header( page ) )
			const days = await box_of( day_navigation( page ) )

			expect( list.top ).toBe( 0 )
			expect( days.top ).toBe( list.bottom )
		} ).toPass()
	} )

	test( "stack the day navigation above the list header, from the large breakpoint", { tag: "@lg" }, async ( { page } ) => {
		await open_page( page, SCHEDULE_PATH )
		await scroll_down_two_screens( page )

		await expect( async () => {
			const days = await box_of( day_navigation( page ) )
			const list = await box_of( schedule_header( page ) )

			expect( days.top ).toBe( 0 )
			expect( list.top ).toBe( days.bottom )
		} ).toPass()
	} )

	test( "move down together under the site header, below the medium breakpoint", { tag: "@sm" }, async ( { page } ) => {
		await open_page( page, SCHEDULE_PATH )
		await scroll_down_two_screens( page )
		await scroll_by( page, -100 )

		await expect( async () => {
			const header = await box_of( site_header( page ) )
			const list = await box_of( schedule_header( page ) )
			const days = await box_of( day_navigation( page ) )

			expect( header.top ).toBe( 0 )
			expect( list.top ).toBe( header.bottom )
			expect( days.top ).toBe( list.bottom )
		} ).toPass()
	} )

	test( "move down together under the site header, from the large breakpoint", { tag: "@lg" }, async ( { page } ) => {
		await open_page( page, SCHEDULE_PATH )
		await scroll_down_two_screens( page )
		await scroll_by( page, -100 )

		await expect( async () => {
			const header = await box_of( site_header( page ) )
			const days = await box_of( day_navigation( page ) )
			const list = await box_of( schedule_header( page ) )

			expect( header.top ).toBe( 0 )
			expect( days.top ).toBe( header.bottom )
			expect( list.top ).toBe( days.bottom )
		} ).toPass()
	} )
} )

function site_header ( page: Page ) {
	return page.getByRole( "banner" )
}

function count_of ( page: Page ) {
	return page.getByText( /^\d+ Events?$/ )
}

/** The bar the listing's count sits in, which is the count's own parent. */
function listing_header ( page: Page ) {
	return count_of( page ).locator( "xpath=.." )
}

/** The bar the schedule's count sits in, one box further out: the row inside it is the count's parent. */
function schedule_header ( page: Page ) {
	return count_of( page ).locator( "xpath=../.." )
}

function day_navigation ( page: Page ) {
	return page.getByRole( "navigation", { name: "Days" } )
}

async function box_of ( locator: Locator ) {
	const box = await locator.boundingBox()

	if ( !box ) {
		throw new Error( "The element is not visible, so it has no box." )
	}

	return {
		bottom: box.y + box.height,
		height: box.height,
		top: box.y,
	}
}
