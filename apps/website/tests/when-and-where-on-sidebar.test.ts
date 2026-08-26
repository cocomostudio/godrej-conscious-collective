
/**
 |
 | When and Where, at the foot of a two-column page's sidebar, driven over HTTP
 | with the CMS stubbed at the fetch boundary.
 |
 | The static site put it in the category listing's sidebar alone. Here it is a
 | property of the **arrangement** rather than of one page: every two-column
 | page gets it, whichever content type answered, and a one-column page — which
 | renders no sidebar at all — gets none.
 |
 | It is chrome, so it follows the **main event**, exactly as the footer's copy
 | does. The page it sits on may resolve to a different event entirely, and the
 | test below pins that disagreement rather than leaving it to be discovered.
 |
 | The fade-out as the footer approaches is a browser behaviour and is not
 | asserted here: it needs a scroll, a viewport and an IntersectionObserver,
 | none of which a rendered response has. What this seam can hold is that the
 | markup arrives, on the right pages, carrying the right event's dates.
 |
 */

import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
} from "vitest"

import {
	type Website,
	boot_website,
} from "./support/boot-website.ts"
import {
	contributor_envelope,
	envelope,
	event,
	plain_string,
	section,
	session_envelope,
} from "./support/envelopes.ts"

/**
 |
 | The venue line. Enough of it to be unmistakable, and short enough not to
 | break on the line wrap the source has in the middle of it.
 |
 */
const ADDRESS = "Pirojshanagar, Vikhroli"

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		"/about": envelope( {
			main_region: [ section( "First" ) ],
			side_region: [ plain_string( "In the side region." ) ],
			title: "About",
		} ),

		"/collaborators/a-collaborator": contributor_envelope( {
			name: "A Collaborator",
		} ),

		"/one-column": envelope( {
			main_region: [ section( "Body" ) ],
			page_layout: "one-column",
			title: "One Column",
		} ),

		/**
		 |
		 | A page belonging to an older run of the programme. The colours are
		 | that run's; the chrome, and so this line, is the current one's.
		 |
		 */
		"/past-edition": envelope( {
			main_region: [ section( "Body" ) ],
			title: "Past Edition",
		}, {
			main_event: event( {
				date_end: "2026-02-08",
				date_start: "2026-02-05",
				name: "Conscious Collective 2026",
			} ),
			resolved_event: event( {
				date_end: "2025-12-14",
				date_start: "2025-12-11",
				main: false,
				name: "Conscious Collective 2025",
			} ),
		} ),

		"/sessions/a-session": session_envelope( { name: "A Session" } ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("a two-column page", () => {
	it("carries When and Where at the foot of its sidebar", async () => {
		const sidebar = first_column( ( await website.get( "/about" ) ).html )

		expect( sidebar ).toContain( ADDRESS )
	})

	it("puts it below everything the content type and the components gave the sidebar", async () => {
		const sidebar = first_column( ( await website.get( "/about" ) ).html )

		expect( sidebar.indexOf( "Back to Home" ) )
			.toBeLessThan( sidebar.indexOf( ADDRESS ) )
		expect( sidebar.indexOf( "In the side region." ) )
			.toBeLessThan( sidebar.indexOf( ADDRESS ) )
	})

	it("says the main event's dates, not the resolved event's", async () => {
		const sidebar = first_column(
			( await website.get( "/past-edition" ) ).html,
		)

		// The machine-readable ends rather than the labels: "5" on its own
		// would pass against almost any markup. React writes the attribute
		// out as it was authored — `dateTime`, not `datetime` — and HTML
		// attribute names are case-insensitive, so a browser reads it either
		// way and only this assertion has to know which.
		expect( sidebar ).toContain( `dateTime="2026-02-05"` )
		expect( sidebar ).toContain( `dateTime="2026-02-08"` )
		expect( sidebar ).toContain( "8 Feb 2026" )

		expect( sidebar ).not.toContain( `dateTime="2025-12-11"` )
		expect( sidebar ).not.toContain( "14 Dec 2025" )
	})

	it("is drawn only from the medium breakpoint up, as the footer's copy also is", async () => {
		const sidebar = first_column( ( await website.get( "/about" ) ).html )

		// The hiding class has to be on a box the address is still *inside*,
		// which asserting that it appears somewhere earlier in the column
		// would not show. Nothing may close between the two.
		const hidden = sidebar.lastIndexOf(
			"max-md:hidden",
			sidebar.indexOf( ADDRESS ),
		)

		expect( hidden ).toBeGreaterThan( -1 )
		expect( sidebar.slice( hidden, sidebar.indexOf( ADDRESS ) ) )
			.not.toContain( "</div>" )
	})
})

describe("every content type that renders in two columns", () => {
	it("carries it on a session's page", async () => {
		const sidebar = first_column(
			( await website.get( "/sessions/a-session" ) ).html,
		)

		expect( sidebar ).toContain( ADDRESS )
	})

	it("carries it on a collaborator's page", async () => {
		const sidebar = first_column(
			( await website.get( "/collaborators/a-collaborator" ) ).html,
		)

		expect( sidebar ).toContain( ADDRESS )
	})
})

describe("a one-column page", () => {
	it("has one copy, in the footer, because it has no sidebar to hold a second", async () => {
		const { html } = await website.get( "/one-column" )

		expect( body_of( html ) ).not.toContain( "layout__1-4__col-1" )
		expect( occurrences( body_of( html ), ADDRESS ) ).toBe( 1 )
	})
})

/**
 |
 | The markup helpers below read the rendered HTML rather than the React tree,
 | because the rendered HTML is what a visitor gets. They are `rendering.test.ts`'s,
 | kept as copies rather than shared: a test support module that grows a helper
 | per file is how two tests start failing for one reason.
 |
 */

function first_column ( html: string ) {
	const start = html.indexOf( "layout__1-4__col-1" )
	const end = html.indexOf( "layout__1-4__col-2" )

	return html.slice( start, end === -1 ? undefined : end )
}

/**
 |
 | React Router streams the loader's data back down as a script, so every string
 | the CMS sent is in the response whether the page rendered it or not. An
 | assertion about how many times something appears has to be made against the
 | body's markup alone.
 |
 */
function body_of ( html: string ) {
	return html.slice( html.indexOf( "<body" ) )
}

function occurrences ( haystack: string, needle: string ) {
	return haystack.split( needle ).length - 1
}
