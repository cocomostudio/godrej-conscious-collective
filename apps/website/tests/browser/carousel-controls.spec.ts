
/**
 |
 | A carousel's previous and next buttons, measured in a browser: where they
 | sit in the heading's row, that they are gone on a phone, and that a press
 | moves the carousel by exactly one card.
 |
 */

import {
	type Locator,
	type Page,
	expect,
	test,
} from "@playwright/test"

import {
	CAROUSEL_PATHS,
	UNLINKED_CAROUSEL_PATH,
} from "./pages.ts"
import { open_page } from "./open-page.ts"

test( "sets the buttons 32px after the link, and 16px apart (@lg)", {
	tag: "@lg",
}, async ( { page } ) => {
	await open_page( page, CAROUSEL_PATHS["one-column"] )

	const link = await box(
		page.getByRole( "link", { name: "View All" } ).first(),
	)
	const previous = await box( button( page, "Previous" ) )
	const next = await box( button( page, "Next" ) )

	expect( previous.left - link.right ).toBeCloseTo( 32, 0 )
	expect( next.left - previous.right ).toBeCloseTo( 16, 0 )
} )

test(
	"holds the buttons in the same spot without a link (@lg)",
	{ tag: "@lg" },
	async ( { page } ) => {
		await open_page( page, CAROUSEL_PATHS["one-column"] )
		const linked = await box( button( page, "Next" ) )

		await open_page( page, UNLINKED_CAROUSEL_PATH )
		const unlinked = await box( button( page, "Next" ) )

		expect( unlinked.right ).toBeCloseTo( linked.right, 0 )
	},
)

test(
	"draws no buttons on a phone (@sm)",
	{ tag: "@sm" },
	async ( { page } ) => {
		await open_page( page, CAROUSEL_PATHS["one-column"] )

		await expect( button( page, "Next" ) ).toBeHidden()
		await expect( button( page, "Previous" ) ).toBeHidden()
	},
)

test( "moves the carousel by exactly one card for a press of Next (@lg)", {
	tag: "@lg",
}, async ( { page } ) => {
	await open_page( page, CAROUSEL_PATHS["one-column"] )

	const first = page.locator( "a[href=\"/sessions/showcase-1\"]" ).first()
	const second = page.locator( "a[href=\"/sessions/showcase-2\"]" ).first()

	// Settled first: the carousel aligns itself once its script has run.
	let resting = 0

	await expect( async () => {
		resting = ( await box( first ) ).left
		await page.waitForTimeout( 200 )
		expect( ( await box( first ) ).left ).toBeCloseTo( resting, 0 )
	} ).toPass()

	await button( page, "Next" ).click()

	await expect( async () => {
		expect( ( await box( second ) ).left ).toBeCloseTo( resting, 0 )
	} ).toPass()
} )

function button ( page: Page, name: string ) {
	return page.getByRole( "button", { exact: true, name } ).first()
}

async function box ( locator: Locator ) {
	const found = await locator.boundingBox()

	expect( found ).not.toBeNull()

	return {
		...found!,
		left: found!.x,
		right: found!.x + found!.width,
	}
}
