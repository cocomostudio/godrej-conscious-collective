
/**
 |
 | A session page, rendered end to end, driven over HTTP with the CMS stubbed at
 | the fetch boundary.
 |
 | A session is the first content type whose page is not simply its regions: a
 | Masthead built from its top-level attributes stands at the head of the main
 | column, and a sidebar carries every fact a visitor needs to decide whether to
 | attend. None of that comes from a component, so none of it is covered by the
 | catalogue's own tests.
 |
 | `body_of` strips the hydration payload before anything is asserted. React
 | Router streams the loader's data back down as a script at the end of the
 | document, so every string the CMS sent is in the response whether it was
 | rendered or not — and an assertion that something was *left out* would pass
 | against nothing.
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
	event,
	instance,
	plain_string,
	responsive_image,
	section,
	session_envelope,
} from "./support/envelopes.ts"

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		"/sessions/all-day": session_envelope( {
			all_day_event: true,
			instances: [
				instance( "2025-12-11", "09:00", "22:00" ),
				instance( "2025-12-12", "09:00", "22:00" ),
			],
			name: "All Day",
			session_date_first: "2025-12-11",
			session_date_last: "2025-12-12",
		} ),

		"/sessions/free-with-booking": session_envelope( {
			category: "Workshop",
			checkout_url: "https://example.com/book",
			name: "Free With Booking",
			price: 0,
		} ),

		"/sessions/living-with-the-land": session_envelope( {
			age_group: "Children",
			category: "Showcase",
			checkout_url: "https://example.com/buy",
			cover: responsive_image( "https://pictures.test/cover.jpg" ),
			instances: [
				instance( "2025-12-11", "10:00", "12:30" ),
				instance( "2025-12-12", "14:00", "16:30" ),
			],
			main_region: [
				section( "The work", {
					content: [ plain_string( "What the fellows made." ) ],
					heading: { content: "The work", level: "h2" },
					register_with_toc: true,
				} ),
			],
			name: "Living with the Land",
			price: 1599,
			session_date_first: "2025-12-11",
			session_date_last: "2025-12-14",
			standfirst: "A two-part showcase.",
			venue: venue_link( "Outdoor Pergola" ),
		} ),

		"/sessions/no-price": session_envelope( {
			category: "Conversation",
			name: "No Price",
		} ),

		"/sessions/other-event": session_envelope( {
			category: "Workshop",
			name: "Other Event",
		}, {
			resolved_event: event( {
				colour_workshop_rgb: "1, 2, 3",
				main: false,
				name: "Conscious Collective 2027",
			} ),
		} ),

		// A Page, for the comparisons that only mean anything side by side.
		"/about": envelope( {
			main_region: [ section( "About" ) ],
			title: "About",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("the masthead", () => {
	it("is built from the session's own attributes, not from a component", async () => {
		const { html } = await website.get( "/sessions/living-with-the-land" )
		const body = body_of( html )

		expect( body ).toContain( "Living with the Land" )
		expect( body ).toContain( "A two-part showcase." )
		expect( body ).toContain( "https://pictures.test/cover.jpg" )
	})

	it("carries the page's only h1, and sits before the session's own content", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( [ ...body.matchAll( /<h1[\s>]/g ) ].length ).toBe( 1 )
		expect( body ).toMatch( /<h1[^>]*>Living with the Land<\/h1>/ )

		// At the start of the main column: the masthead's own heading comes
		// before anything the main region holds. Anchored on the `h1` rather
		// than on the words, which also appear in the document's `title`.
		expect( body.indexOf( "<h1" ) )
			.toBeLessThan( body.indexOf( "What the fellows made." ) )
	})

	it("names the document after the session, not after a title it has not got", async () => {
		const { html } = await website.get( "/sessions/living-with-the-land" )

		expect( html ).toContain(
			"<title>Living with the Land — Godrej Conscious Collective</title>",
		)
	})

	it("renders without a cover", async () => {
		const { status, html } = await website.get( "/sessions/no-price" )

		expect( status ).toBe( 200 )
		expect( body_of( html ) ).toContain( "No Price" )
	})
})

describe("the sidebar", () => {
	it("opens with a back link to the session's own category", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( body ).toContain( "Back to Showcases" )
		expect( body ).toContain( `href="/showcases"` )
		expect( body ).not.toContain( "Back to Home" )
	})

	it("names the category the session actually has", async () => {
		const body = body_of(
			( await website.get( "/sessions/free-with-booking" ) ).html,
		)

		expect( body ).toContain( "Back to Workshops" )
		expect( body ).toContain( `href="/workshops"` )
	})

	it("carries the details a visitor decides on", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( body ).toContain( "Showcase" )
		expect( body ).toContain( "Children" )
		expect( body ).toContain( "Outdoor Pergola" )
		expect( body ).toContain( "11 – 14 Dec 2025" )
	})

	it("shows every instance of a session that runs more than once", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( body ).toContain( "11 Dec, 10:00 am – 12:30 pm" )
		expect( body ).toContain( "12 Dec, 2:00 pm – 4:30 pm" )
	})

	it("ends with the Add to Calendar control", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( body ).toContain( "Add to Calendar" )
		expect( body.indexOf( "Outdoor Pergola" ) )
			.toBeLessThan( body.indexOf( "Add to Calendar" ) )
	})

	it("does not carry a table of contents, which is a Page's alone", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		// The section opted in, and a session has no `toc` attribute for that
		// opt-in to answer to.
		expect( body ).not.toContain( `aria-label="On this page"` )
	})
})

/**
 |
 | The design shows a session's sidebar on a desktop and, on a phone, shows the
 | masthead first and repeats the sidebar's contents beneath it. Both renderings
 | are in the markup and CSS chooses between them, so the same content appears
 | twice on purpose — which is exactly the thing a later change would "tidy up"
 | without knowing why it was there.
 |
 | Asserted as duplication and position rather than as class strings: the spec
 | puts Tailwind classes out of scope for the tests, and what would actually
 | regress here is a copy going missing.
 |
 */
describe("the sidebar's second rendering, for a phone", () => {
	it("repeats the details list and the control inside the main column", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( occurrences( body, "Add to Calendar" ) ).toBe( 2 )
		expect( occurrences( body, "Outdoor Pergola" ) ).toBe( 2 )
	})

	it("puts the second copy after the masthead, where the design has it", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		// The masthead sits between the sidebar's copy and the repeat. Anchored
		// on the `h1`, because the session's name is also in the document's
		// `title` and that comes before everything.
		const masthead = body.indexOf( "<h1" )

		expect( body.indexOf( "Outdoor Pergola" ) ).toBeLessThan( masthead )
		expect( body.lastIndexOf( "Outdoor Pergola" ) )
			.toBeGreaterThan( masthead )
	})

	it("repeats the back link inside the masthead", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( occurrences( body, "Back to Showcases" ) ).toBe( 2 )
	})

	it("is absent on a Page, whose sidebar shows at every width", async () => {
		const body = body_of( ( await website.get( "/about" ) ).html )

		expect( occurrences( body, "Back to Home" ) ).toBe( 1 )
	})
})

describe("times", () => {
	it("read \"All day\" and show no clock times at all", async () => {
		const body = body_of(
			( await website.get( "/sessions/all-day" ) ).html,
		)

		expect( body ).toContain( "All day" )
		expect( body ).not.toContain( "9:00 am" )
		expect( body ).not.toContain( "10:00 pm" )
	})
})

describe("the price", () => {
	it("reads \"Free\" when it is zero", async () => {
		const body = body_of(
			( await website.get( "/sessions/free-with-booking" ) ).html,
		)

		expect( body ).toContain( "Free" )
	})

	it("carries the booking link beside it, free or not", async () => {
		const body = body_of(
			( await website.get( "/sessions/free-with-booking" ) ).html,
		)

		expect( body ).toContain( `href="https://example.com/book"` )
		expect( body ).toContain( "Buy tickets" )
		expect( body.indexOf( "Free" ) )
			.toBeLessThan( body.indexOf( "https://example.com/book" ) )
	})

	it("reads the same whether the session costs money or not", async () => {
		const paid = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( paid ).toContain( "Buy tickets" )
	})

	it("is absent entirely when no booking link is set", async () => {
		const body = body_of(
			( await website.get( "/sessions/no-price" ) ).html,
		)

		expect( body ).not.toContain( "Buy tickets" )
	})

	it("shows nothing at all when it is empty", async () => {
		const body = body_of(
			( await website.get( "/sessions/no-price" ) ).html,
		)

		expect( body ).not.toContain( "Free" )
		expect( body ).not.toContain( "₹" )
	})

	it("carries the currency the site is priced in", async () => {
		const body = body_of(
			( await website.get( "/sessions/living-with-the-land" ) ).html,
		)

		expect( body ).toContain( "₹ 1599" )
	})
})

describe("the page's colours", () => {
	it("point the context colour at the session's category", async () => {
		const { html } = await website.get( "/sessions/living-with-the-land" )

		expect( html ).toContain(
			"--ctx-context-color:var(--ctx-showcase-color)",
		)
	})

	it("follow the resolved event, not the main one", async () => {
		const { html } = await website.get( "/sessions/other-event" )

		expect( html ).toContain( "--ctx-workshop-color:1, 2, 3" )
		expect( html ).toContain(
			"--ctx-context-color:var(--ctx-workshop-color)",
		)
	})
})

/**
 |
 | **One column is not something a session can be.** The content type carries no
 | `page_layout` attribute at all, so there is no setting for an editor to get
 | wrong — a session page has a sidebar the design depends on, and one column
 | would leave a visitor with no times, no price, no venue and no way back.
 |
 | The one-column arrangement itself is a Page's, and `rendering.test.ts`
 | covers it there.
 |
 */
describe("a session", () => {
	it("always has its sidebar, whatever else the envelope carries", async () => {
		const body = body_of(
			( await website.get( "/sessions/no-price" ) ).html,
		)

		expect( body ).toContain( "Back to Conversations" )
	})
})

describe("a Page is untouched by any of it", () => {
	it("still says Back to Home and carries no details list", async () => {
		const body = body_of( ( await website.get( "/about" ) ).html )

		expect( body ).toContain( "Back to Home" )
		expect( body ).not.toContain( "Add to Calendar" )
	})
})

/**
 |
 | A venue: the link component as an ordinary attribute rather than as an entry
 | in a dynamic zone, so it carries no `__component`.
 |
 */
function venue_link ( label: string ) {
	return {
		label,
		style: "plain" as const,
		url: "https://example.com/maps/pergola",
	}
}

/**
 |
 | The document with its scripts taken out.
 |
 | React Router streams the loader's data back down as a script, so every string
 | the CMS sent is in the response whether it was rendered or not. An assertion
 | that something was left out has to be made against the markup alone.
 |
 */
function body_of ( html: string ) {
	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}

function occurrences ( haystack: string, needle: string ) {
	return haystack.split( needle ).length - 1
}
