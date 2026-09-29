/**
 |
 | Reads a value on every frame while `action` runs, and for half a second
 | after, so that a transition that starts late or stutters is caught.
 |
 | `read` runs in the page, so it can use nothing from the test around it.
 |
 */

import type { Page } from "@playwright/test"

export async function sample_every_frame<T> (
	page: Page,
	action: () => Promise<void>,
	read: () => T,
): Promise<T[]> {
	await page.evaluate( ( source ) => {
		const read = new Function( `return (${source})()` ) as () => unknown
		const samples: unknown[] = []

		;( window as unknown as { __samples: unknown[] } ).__samples = samples

		const tick = () => {
			samples.push( read() )
			requestAnimationFrame( tick )
		}

		requestAnimationFrame( tick )
	}, read.toString() )

	await action()
	await page.waitForTimeout( 500 )

	return page.evaluate( () =>
		( window as unknown as { __samples: T[] } ).__samples
	)
}
