
/**
 |
 | A solid button, measured in a browser. The header's Register Now is the
 | one on every page: a large, theme-coloured solid button.
 |
 */

import {
	type Page,
	expect,
	test,
} from "@playwright/test"

import { TUNED_BUTTONS_PATH } from "./pages.ts"
import { open_page } from "./open-page.ts"

test(
	"keeps its size with a 1px border (@lg)",
	{ tag: "@lg" },
	async ( { page } ) => {
		await open_page( page, TUNED_BUTTONS_PATH )

		const register = register_now( page )
		const button = await register.boundingBox()
		const label = await register.locator( "span" ).first().boundingBox()

		// 24px either side of the words, the border included, and 40px tall.
		expect( button!.width - label!.width ).toBeCloseTo( 48, 0 )
		expect( button!.height ).toBeCloseTo( 40, 0 )
		expect( await style_of( page, "borderTopWidth" ) ).toBe( "1px" )
	},
)

test(
	"writes white on its fill, and draws its border in the fill's colour at rest (@lg)",
	{ tag: "@lg" },
	async ( { page } ) => {
		await open_page( page, TUNED_BUTTONS_PATH )

		expect( await style_of( page, "color" ) ).toBe( "rgb(255, 255, 255)" )
		expect( await style_of( page, "borderTopColor" ) )
			.toBe( await style_of( page, "backgroundColor" ) )
	},
)

test(
	"changes its fill and its border under a pointer and while pressed (@lg)",
	{ tag: "@lg" },
	async ( { page } ) => {
		await open_page( page, TUNED_BUTTONS_PATH )

		const at_rest = await colours_of( page )

		await register_now( page ).hover()
		const hovered = await colours_of( page )

		await page.mouse.down()
		const pressed = await colours_of( page )
		await page.mouse.up()

		expect( hovered.fill ).not.toBe( at_rest.fill )
		expect( hovered.border ).not.toBe( at_rest.border )
		expect( pressed.fill ).not.toBe( hovered.fill )
		expect( pressed.fill ).not.toBe( at_rest.fill )
	},
)

function register_now ( page: Page ) {
	return page.getByRole( "button", { name: "Register Now" } ).first()
}

async function style_of (
	page: Page,
	property: "backgroundColor" | "borderTopColor" | "borderTopWidth" | "color",
) {
	return register_now( page ).evaluate(
		( element, name ) => getComputedStyle( element )[name],
		property,
	)
}

/** Read once the transition, if any, has had time to finish. */
async function colours_of ( page: Page ) {
	await page.waitForTimeout( 400 )

	return {
		border: await style_of( page, "borderTopColor" ),
		fill: await style_of( page, "backgroundColor" ),
	}
}
