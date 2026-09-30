
/**
 |
 | A quote with no portrait, measured in a browser. Nothing holds the
 | portrait's place: on a phone the attribution takes the card's full width,
 | and from the medium breakpoint the mark and the words move into the room
 | the portrait would have taken.
 |
 */

import {
	type Page,
	expect,
	test,
} from "@playwright/test"

import { PORTRAITLESS_QUOTE_PATH } from "./pages.ts"
import { open_page } from "./open-page.ts"

test(
	"runs the attribution from the card's content edge (@sm)",
	{ tag: "@sm" },
	async ( { page } ) => {
		await open_page( page, PORTRAITLESS_QUOTE_PATH )

		const attribution = await page.getByText( "George Bernard Shaw" )
			.boundingBox()

		expect( attribution!.x ).toBeCloseTo( await content_edge( page ), 0 )
		expect( attribution!.x + attribution!.width )
			.toBeCloseTo( await content_edge( page, "right" ), 0 )
	},
)

test(
	"starts the mark where the portrait would be (@lg)",
	{ tag: "@lg" },
	async ( { page } ) => {
		await open_page( page, PORTRAITLESS_QUOTE_PATH )

		const mark = await page.locator( "figure blockquote svg" ).first()
			.boundingBox()

		expect( mark!.x ).toBeCloseTo( await content_edge( page ), 0 )
	},
)

/** The inside edge of the card's padding, on the side asked for. */
async function content_edge ( page: Page, side: "left" | "right" = "left" ) {
	return page.locator( "figure", { hasText: "George Bernard Shaw" } )
		.evaluate(
			( figure, which ) => {
				const rect = figure.getBoundingClientRect()
				const style = getComputedStyle( figure )

				return which === "left"
					? rect.left + parseFloat( style.borderLeftWidth )
						+ parseFloat( style.paddingLeft )
					: rect.right - parseFloat( style.borderRightWidth )
						- parseFloat( style.paddingRight )
			},
			side,
		)
}
