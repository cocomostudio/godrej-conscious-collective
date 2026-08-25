
/**
 |
 | A page rendered end to end, driven over HTTP with the CMS stubbed at the
 | fetch boundary.
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
	envelope,
	heading,
	plain_string,
	section,
	unknown_component,
} from "./support/envelopes.ts"

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		"/about": envelope( {
			main_region: [
				section( "First", {
					content: [ plain_string( "The first paragraph." ) ],
					heading: { content: "First heading", level: "h2" },
					register_with_toc: true,
				} ),
				section( "Second", {
					content: [ plain_string( "The second paragraph." ) ],
					register_with_toc: true,
				} ),
				section( "Not listed", {
					content: [ plain_string( "Present but unlisted." ) ],
					register_with_toc: false,
				} ),
			],
			side_region: [
				heading( "Getting here", { level: "h4" } ),
				plain_string( "Godrej One, Vikhroli East, Mumbai." ),
			],
			standfirst: "A standfirst.",
			title: "About",
		} ),

		"/home": envelope( {
			main_region: [ section( "Welcome" ) ],
			title: "Home",
		} ),

		"/no-toc": envelope( {
			main_region: [
				section( "Would have been listed", {
					register_with_toc: true,
				} ),
			],
			title: "No table of contents",
			toc: false,
		} ),

		"/one-column": envelope( {
			main_region: [
				section( "Body", {
					content: [ plain_string( "One column." ) ],
					heading: { content: "Body", level: "h2" },
					register_with_toc: true,
				} ),
			],
			page_layout: "one-column",
			side_region: [ plain_string( "Never rendered." ) ],
			standfirst: "Still has a standfirst.",
			title: "One Column",
		} ),

		"/section-heading-opts-in": envelope( {
			main_region: [
				section( "Not the label", {
					heading: {
						content: "The heading's own label",
						id: 4001,
						register_with_toc: true,
					},
				} ),
			],
			title: "Section heading",
		} ),

		"/repeated-titles": envelope( {
			main_region: [
				section( "Programme", { register_with_toc: true } ),
				section( "Programme", { register_with_toc: true } ),
				section( "Programme", { register_with_toc: true } ),
			],
			title: "Repeated",
		} ),

		"/unknown": envelope( {
			main_region: [
				section( "Holds something new", {
					content: [
						plain_string( "Before." ),
						unknown_component(),
						plain_string( "After." ),
					],
				} ),
			],
			title: "Unknown",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("a page", () => {
	it("renders its content from the CMS", async () => {
		const { html, status } = await website.get( "/about" )

		expect( status ).toBe( 200 )
		expect( html ).toContain( "The first paragraph." )
		expect( html ).toContain( "The second paragraph." )
	})

	it("puts the site title in the document title", async () => {
		const { html } = await website.get( "/about" )

		expect( html ).toContain(
			"<title>About — Godrej Conscious Collective</title>",
		)
	})
})

describe("root assembly", () => {
	it("turns flat attributes into a sidebar and a main column", async () => {
		const { html } = await website.get( "/about" )

		expect( html ).toContain( "layout__1-4__col-1" )
		expect( html ).toContain( "layout__1-4__col-2" )
	})

	it("renders the back link first in the sidebar", async () => {
		const { html } = await website.get( "/about" )
		const sidebar = first_column( html )

		expect( sidebar.indexOf( "Back to Home" ) ).toBeGreaterThanOrEqual( 0 )
		expect( sidebar.indexOf( "Back to Home" ) )
			.toBeLessThan( sidebar.indexOf( "About" ) )
	})

	it("puts the content type's contributions before the components'", async () => {
		const sidebar = first_column( ( await website.get( "/about" ) ).html )

		// The table of contents is the content type's; the side region's
		// blocks are the components'.
		expect( sidebar.indexOf( "First" ) )
			.toBeLessThan( sidebar.indexOf( "Getting here" ) )
	})

	it("renders the page's own title and standfirst", async () => {
		const { html } = await website.get( "/about" )

		expect( html ).toContain( "A standfirst." )
		expect( headings( html )[0] ).toMatch( /^h1:/ )
	})
})

describe("heading depth", () => {
	it("derives from nesting rather than from what the editor picked", async () => {
		const { html } = await website.get( "/about" )

		// The side region's heading asked for "h4" and the sections' for "h2".
		// Both sit one level below the page title, so both are `h2` elements
		// and only their size classes differ.
		expect( headings( html ) ).toEqual( [
			"h1:About",
			"h2:Getting here",
			"h2:First heading",
		] )
	})
})

describe("the table of contents", () => {
	it("lists only the sections that opted in, in document order", async () => {
		const { html } = await website.get( "/about" )
		const listed = toc_entries( html )

		expect( listed ).toEqual( [ "First", "Second" ] )
	})

	it("gives a colliding title a numeric suffix", async () => {
		const { html } = await website.get( "/repeated-titles" )

		expect( anchors( html ) ).toEqual( [
			"programme",
			"programme-2",
			"programme-3",
		] )
	})

	it("lists a section's own heading when that heading opted in", async () => {
		const { html } = await website.get( "/section-heading-opts-in" )

		expect( toc_entries( html ) ).toEqual( [ "The heading's own label" ] )
	})

	it("is absent when the page asked for none", async () => {
		const { html } = await website.get( "/no-toc" )

		expect( html ).not.toContain( "On this page" )
		expect( html ).toContain( "Would have been listed" )
	})
})

describe("a one-column page", () => {
	it("renders no sidebar at all", async () => {
		const { html } = await website.get( "/one-column" )

		expect( html ).not.toContain( "layout__1-4__col-1" )
		expect( html ).not.toContain( "Back to Home" )
		expect( html ).not.toContain( "On this page" )
		expect( html ).not.toContain( "Never rendered." )
	})

	it("still renders its main column", async () => {
		const { html } = await website.get( "/one-column" )

		expect( html ).toContain( "One column." )
	})

	it("shows no title of its own, and no standfirst under it", async () => {
		const { html } = await website.get( "/one-column" )

		expect( body_of( html ) ).not.toContain( "One Column" )
		expect( body_of( html ) ).not.toContain( "Still has a standfirst." )

		// The document's headings are the blocks' own, and start where the
		// editor's first one does rather than under a title the page injected.
		expect( headings( html ) ).toEqual( [ "h2:Body" ] )
	})
})

describe("an unknown component", () => {
	it("does not take the page down", async () => {
		const { html, status } = await website.get( "/unknown" )

		expect( status ).toBe( 200 )
		expect( html ).toContain( "Before." )
		expect( html ).toContain( "After." )
	})
})

describe("paths", () => {
	it("falls back to the home page when the root resolves to nothing", async () => {
		const { html, status } = await website.get( "/" )

		expect( status ).toBe( 200 )
		expect( html ).toContain( "Welcome" )
		expect( website.cms.requests.slice( -2 ) ).toEqual( [
			"/?status=published",
			"/home?status=published",
		] )
	})

	it("redirects the home page's own path permanently to the root", async () => {
		const { headers, status } = await website.get( "/home" )

		expect( status ).toBe( 301 )
		expect( headers.get( "location" ) ).toBe( "/" )
	})

	it("answers 404 for a path that resolves to nothing", async () => {
		const { html, status } = await website.get( "/no-such-page" )

		expect( status ).toBe( 404 )
		expect( html ).toContain( "Page not found" )
	})

	it("passes the status parameter through for draft preview", async () => {
		await website.get( "/about?status=draft" )

		expect( website.cms.requests.at( -1 ) ).toBe( "/about?status=draft" )
	})
})

/**
 |
 | The markup helpers below read the rendered HTML rather than the React tree,
 | because the rendered HTML is what a visitor gets.
 |
 */

function first_column ( html: string ) {
	const start = html.indexOf( "layout__1-4__col-1" )
	const end = html.indexOf( "layout__1-4__col-2" )

	return html.slice( start, end === -1 ? undefined : end )
}

/**
 |
 | React Router streams the loader's data back down as a script, and the head
 | carries the document's own `<title>`, so every string the CMS sent is in the
 | response whether the page rendered it or not. An assertion that something was
 | left out has to be made against the body's markup alone.
 |
 */
function body_of ( html: string ) {
	return html.slice( html.indexOf( "<body" ) )
		.replace( /<script[\s\S]*?<\/script>/g, "" )
}

function headings ( html: string ) {
	return [ ...html.matchAll( /<(h[1-6])\b[^>]*>(.*?)<\/\1>/g ) ]
		.map( ( [ , tag, content ] ) => `${tag}:${strip( content )}` )
}

function toc_entries ( html: string ) {
	const nav = between( html, `aria-label="On this page"`, "</nav>" )

	return [
		...nav.matchAll(
			/<span class="text-small font-medium">(.*?)<\/span>/g,
		),
	]
		.map( ( [ , label ] ) => strip( label ) )
}

function anchors ( html: string ) {
	return [ ...html.matchAll( /<section [^>]*id="([^"]+)"/g ) ]
		.map( ( [ , anchor ] ) => anchor )
}

function between ( html: string, from: string, to: string ) {
	const start = html.indexOf( from )

	if ( start === -1 ) {
		return ""
	}

	return html.slice( start, html.indexOf( to, start ) )
}

function strip ( html: string ) {
	return html.replace( /<[^>]+>/g, "" )
		.replace( /&#x27;/g, "'" )
		.replace( /&amp;/g, "&" )
		.trim()
}
