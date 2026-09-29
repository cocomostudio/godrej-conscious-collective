/**
 |
 | Scrolling the way a reader does: with the mouse wheel.
 |
 | Only a scroll the reader makes tells the browser which way they are going. A
 | jump to a link, or a script's `scrollTo()`, does not.
 |
 */

import {
	type Page,
	expect,
} from "@playwright/test"

/** Scrolls with the wheel, and waits for the page to arrive. */
export async function scroll_by ( page: Page, distance: number ) {
	const viewport = page.viewportSize()!
	const from = await page.evaluate( () => window.scrollY )

	await page.mouse.move( viewport.width / 2, viewport.height / 2 )
	await page.mouse.wheel( 0, distance )

	await expect.poll( () => page.evaluate( () => window.scrollY ) )
		.toBe( Math.max( 0, from + distance ) )
}

export async function scroll_down_two_screens ( page: Page ) {
	await scroll_by( page, page.viewportSize()!.height * 2 )
}
