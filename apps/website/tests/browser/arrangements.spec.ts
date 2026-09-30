
/**
 |
 | Listings of session cards, measured in a browser: how far a carousel runs,
 | where its first card sits, the room it leaves for the cards' shadows, and
 | the featured card's height.
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
	COVER_SIZES,
	FEATURED_PATHS,
} from "./pages.ts"
import { open_page } from "./open-page.ts"

/**
 |
 | The card's shadow is `0 4px 32px`: it reaches 28px above the card and 36px
 | below it.
 |
 */
const SHADOW_ABOVE = 28
const SHADOW_BELOW = 36

for ( const [ layout, path ] of Object.entries( CAROUSEL_PATHS ) ) {
	test(
		`a carousel runs out to the edges of its column on a ${layout} page (@lg)`,
		{ tag: "@lg" },
		async ( { page } ) => {
			await open_page( page, path )

			await expect( async () => {
				const track = await box(
					viewport_of( first_card( page, "showcase" ) ),
				)
				const column = await box( section_of( page, "Showcases" ) )

				expect( track.left ).toBeCloseTo( column.left, 0 )
				expect( track.right ).toBeCloseTo( column.right, 0 )
			} ).toPass()
		},
	)

	test(
		`a carousel lines its first card up with the words above it on a ${layout} page (@lg)`,
		{ tag: "@lg" },
		async ( { page } ) => {
			await open_page( page, path )

			await expect( async () => {
				const card = await box( first_card( page, "showcase" ) )
				const heading = await box(
					page.getByRole( "heading", { name: "Showcases" } ),
				)

				expect( card.left ).toBeCloseTo( heading.left, 0 )
			} ).toPass()
		},
	)
}

for ( const tag of [ "@sm", "@lg" ] ) {
	test(
		`a carousel leaves room for the whole of each card's shadow (${tag})`,
		{ tag },
		async ( { page } ) => {
			await open_page( page, CAROUSEL_PATHS["one-column"] )

			const card = await box( first_card( page, "showcase" ) )
			const clip = await box(
				viewport_of( first_card( page, "showcase" ) ),
			)

			expect( clip.top ).toBeLessThanOrEqual( card.top - SHADOW_ABOVE )
			expect( clip.bottom ).toBeGreaterThanOrEqual(
				card.bottom + SHADOW_BELOW,
			)
		},
	)

	test( `every carousel sits the same distance below its heading (${tag})`, {
		tag,
	}, async ( { page } ) => {
		await open_page( page, CAROUSEL_PATHS["one-column"] )

		const gap = async ( title: string, category: string ) =>
			( await box( first_card( page, category ) ) ).top
			- ( await box( page.getByRole( "heading", { name: title } ) ) )
				.bottom

		expect( await gap( "Showcases", "showcase" ) )
			.toBeCloseTo( await gap( "Conversations", "conversation" ), 0 )
	} )
}

for ( const [ shape, path ] of Object.entries( FEATURED_PATHS ) ) {
	for ( const tag of [ "@below-lg", "@lg" ] ) {
		test(
			`the featured card is 486px tall with a ${shape} cover (${tag})`,
			{ tag },
			async ( { page } ) => {
				const { height, width } =
					COVER_SIZES[shape as keyof typeof COVER_SIZES]

				await page.route(
					"http://cms.test/**",
					( route ) =>
						route.fulfill( {
							body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="grey"/></svg>`,
							contentType: "image/svg+xml",
						} ),
				)

				await open_page( page, path )

				await expect( async () => {
					expect(
						( await box( page.locator( ".card--featured" ) ) )
							.height,
					)
						.toBeCloseTo( 486, 0 )
				} ).toPass()
			},
		)
	}
}

function first_card ( page: Page, category: string ) {
	return page.locator( `a[href="/sessions/${category}-1"]` ).first()
}

/** The box that clips a carousel: the card's slide, its track, then this. */
function viewport_of ( card: Locator ) {
	return card.locator( "xpath=../../.." )
}

function section_of ( page: Page, title: string ) {
	return page.getByRole( "heading", { name: title } )
		.locator( "xpath=ancestor::section[1]" )
}

async function box ( locator: Locator ) {
	const found = await locator.boundingBox()

	expect( found ).not.toBeNull()

	return {
		...found!,
		bottom: found!.y + found!.height,
		left: found!.x,
		right: found!.x + found!.width,
		top: found!.y,
	}
}
