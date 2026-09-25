
/**
 |
 | The website the browser tests drive: the same harness the server-side tests
 | boot, serving `PAGES` with the CMS stubbed, on the port Playwright waits on.
 |
 | Started by Playwright's `webServer` and stopped by it too, so it holds the
 | process open and does nothing else.
 |
 */

import { boot_website } from "../support/boot-website.ts"

import { PAGES } from "./pages.ts"

await boot_website( PAGES, { port: Number( process.env.PORT ) } )
