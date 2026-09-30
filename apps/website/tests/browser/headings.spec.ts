
/**
 |
 | A heading's weight, read in a browser: semibold at the three largest sizes
 | and regular at the three smallest, on a phone and on a desktop alike.
 |
 */

import {
	expect,
	test,
} from "@playwright/test"

import { HEADINGS_PATH } from "./pages.ts"
import { open_page } from "./open-page.ts"

const WEIGHTS = { 1: "600", 2: "600", 3: "600", 4: "400", 5: "400", 6: "400" }

for ( const tag of [ "@sm", "@lg" ] ) {
	test(
		`weighs each heading by its size (${tag})`,
		{ tag },
		async ( { page } ) => {
			await open_page( page, HEADINGS_PATH )

			for ( const [ size, weight ] of Object.entries( WEIGHTS ) ) {
				const found = await page
					.getByRole( "heading", {
						name: `A heading at size ${size}`,
					} )
					.evaluate( ( element ) =>
						getComputedStyle( element ).fontWeight
					)

				expect( found, `size ${size}` ).toBe( weight )
			}
		},
	)
}
