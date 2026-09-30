
/**
 |
 | The marquee, measured in a browser.
 |
 | It runs out to the edges of the column it is in, exactly as far as a
 | full-bleed image in the same column does, on either page layout.
 |
 */

import {
	type Page,
	expect,
	test,
} from "@playwright/test"

import { BLEEDING_MARQUEE_PATHS } from "./pages.ts"

/** A 1×1 transparent PNG: the stub CMS's uploads are not reachable from a browser. */
const PIXEL = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
	"base64",
)

for ( const [ layout, path ] of Object.entries( BLEEDING_MARQUEE_PATHS ) ) {
	for ( const tag of [ "@sm", "@lg" ] ) {
		test( `reaches as far as a full-bleed image on a ${layout} page (${tag})`, { tag }, async ( { page } ) => {
			await page.route( "http://cms.test/**", ( route ) =>
				route.fulfill( { body: PIXEL, contentType: "image/png" } )
			)

			await page.goto( path )

			await expect( async () => {
				const bar = await bar_of( page ).boundingBox()
				const image = await page.locator( "figure", {
					has: page.getByRole( "img", { name: "Edge to edge" } ),
				} ).boundingBox()

				expect( bar ).not.toBeNull()
				expect( image ).not.toBeNull()

				expect( bar!.x ).toBeCloseTo( image!.x, 0 )
				expect( bar!.x + bar!.width ).toBeCloseTo( image!.x + image!.width, 0 )
			} ).toPass()
		} )
	}
}

/** The marquee's bar: the element three levels above one of its items. */
function bar_of ( page: Page ) {
	return page
		.getByText( "The venue", { exact: true } )
		.first()
		.locator( "xpath=ancestor::div[2]" )
}
