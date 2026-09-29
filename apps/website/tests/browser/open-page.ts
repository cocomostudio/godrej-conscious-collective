/**
 |
 | Opens a page and waits for it to hydrate. The site header's script is
 | listening from then on, and marks the site chrome with its state, so a scroll
 | made after this returns is one the page sees.
 |
 */

import type { Page } from "@playwright/test"

export async function open_page ( page: Page, path: string ) {
	await page.goto( path )
	await page.evaluate( () => document.fonts.ready )
	await page.locator( "[data-site-header]" ).waitFor( { state: "attached", timeout: 20_000 } )
}
