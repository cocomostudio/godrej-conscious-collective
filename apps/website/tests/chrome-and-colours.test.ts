
/**
 |
 | The site chrome and the context colours, driven over HTTP with the CMS
 | stubbed at the fetch boundary.
 |
 | Two rules are under test and they deliberately disagree with each other:
 |
 |   • **the chrome follows the main event**, on every page, always — so a page
 |     belonging to a past or a future event still advertises the event
 |     that is currently running; and
 |
 |   • **the colours follow the resolved event** — the entry's own event first,
 |     then the main event, then a hardcoded palette.
 |
 | The disagreement is the point, and it is recorded as a decision with its
 | downside accepted, so the test that pins both at once on one page is the one
 | that matters most here.
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
	heading,
	page_shell,
	section,
	session_card,
	session_list,
} from "./support/envelopes.ts"

const MAIN = event( {
	date_end: "2025-12-14",
	date_start: "2025-12-11",
	main: true,
	name: "Conscious Collective 2025",
} )

const OTHER_EVENT = event( {
	colour_contributor_rgb: "122, 92, 255",
	colour_conversation_rgb: "27, 127, 75",
	colour_experience_rgb: "232, 180, 160",
	colour_showcase_rgb: "194, 65, 12",
	colour_theme_rgb: "27, 127, 75",
	colour_workshop_rgb: "245, 158, 11",
	date_end: "2027-12-05",
	date_start: "2027-12-02",
	main: false,
	name: "Conscious Collective 2027",
} )

const SHELL = page_shell( {
	navigation_footer: [
		{ label: "Privacy Policy", style: "plain", url: "/privacy-policy" },
		{
			label: "Legal Disclaimer",
			style: "plain",
			url: "/legal-disclaimer",
		},
	],
	navigation_header: [
		{ label: "Showcases", style: "plain", url: "/showcases" },
		{ label: "Schedule", style: "plain", url: "/schedule" },
	],
} )

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		// The ordinary case: no event of its own, so both slots are the main
		// event.
		"/about": envelope(
			{ main_region: [ section( "About" ) ], title: "About" },
			{ main_event: MAIN, page_shell: SHELL, resolved_event: MAIN },
		),

		// A page belonging to the event that is not running.
		"/next-event": envelope(
			{ main_region: [ section( "Next" ) ], title: "Next Event" },
			{
				main_event: MAIN,
				page_shell: SHELL,
				resolved_event: OTHER_EVENT,
			},
		),

		// No event at all — neither the entry's own nor a main one.
		"/no-event": envelope(
			{ main_region: [ section( "Bare" ) ], title: "Bare" },
			{ main_event: null, page_shell: SHELL, resolved_event: null },
		),

		// No page shell at all, which is what an entry gets when no shell is
		// marked default. The attribute is left null rather than the save being
		// refused, so this has to render.
		"/no-shell": envelope(
			{ main_region: [ section( "Shell-less" ) ], title: "Shell-less" },
			{ main_event: MAIN, page_shell: null, resolved_event: MAIN },
		),

		// A one-column page, which renders no sidebar but still wears the
		// chrome: chrome is site furniture rather than page content.
		"/one-column": envelope(
			{
				main_region: [ section( "Alone" ) ],
				page_layout: "one-column",
				title: "Alone",
			},
			{ main_event: MAIN, page_shell: SHELL, resolved_event: MAIN },
		),

		/* _____
		 | The colour scheme, in each of the three kinds of answer it has:
		 | one of the event's roles, one of the two static colours, and
		 | nothing at all.
		 */

		"/black-page": envelope(
			{
				color_scheme: "black",
				main_region: [
					section( "In black", {
						content: [ heading( "A heading in black" ) ],
					} ),
				],
				title: "Black",
			},
			{ main_event: MAIN, page_shell: SHELL, resolved_event: MAIN },
		),

		"/mixed-cards": envelope(
			{
				color_scheme: "white",
				main_region: [
					section( "Mixed", {
						content: [ session_list( [
							session_card( {
								category: "Showcase",
								name: "Living with the Land",
								path: "/sessions/living-with-the-land",
							} ),
							session_card( {
								category: "Workshop",
								name: "Cooling Pots in Clay",
								path: "/sessions/cooling-pots-in-clay",
							} ),
						] ) ],
					} ),
				],
				title: "Mixed",
			},
			{ main_event: MAIN, page_shell: SHELL, resolved_event: MAIN },
		),

		// What every page saved before the attribute existed comes back as.
		"/no-colour-scheme": envelope(
			{
				color_scheme: null,
				main_region: [ section( "Unset" ) ],
				title: "Unset",
			},
			{ main_event: MAIN, page_shell: SHELL, resolved_event: MAIN },
		),

		"/workshop-page": envelope(
			{
				color_scheme: "workshop",
				main_region: [ section( "In the workshop colour" ) ],
				title: "Workshop",
			},
			{ main_event: MAIN, page_shell: SHELL, resolved_event: MAIN },
		),

		"/white-page": envelope(
			{
				color_scheme: "white",
				main_region: [ section( "In white" ) ],
				title: "White",
			},
			{ main_event: MAIN, page_shell: SHELL, resolved_event: MAIN },
		),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("the header and the footer", () => {
	it("show the main event's date range", async () => {
		const { html } = await website.get( "/about" )

		expect( text_of( html ) ).toContain( "11–14 Dec 2025" )

		// Both ends carry their own machine-readable day. The static site gave
		// the closing `<time>` the opening day's value, which said the event
		// ended before it started.
		expect( html ).toMatch( /datetime="2025-12-11"/i )
		expect( html ).toMatch( /datetime="2025-12-14"/i )
	})

	it("offer Register Now", async () => {
		const { html } = await website.get( "/about" )

		expect( html ).toContain( "Register Now" )
	})

	it("show the main event's dates even on a page from another event", async () => {
		const { html } = await website.get( "/next-event" )

		expect( text_of( html ) ).toContain( "11–14 Dec 2025" )
		expect( text_of( html ) ).not.toContain( "Dec 2027" )
	})

	it("wrap a one-column page too", async () => {
		const { html } = await website.get( "/one-column" )

		expect( text_of( html ) ).toContain( "11–14 Dec 2025" )
		expect( html ).toContain( "Register Now" )
	})

	it("take their navigation from the page shell", async () => {
		const { html } = await website.get( "/about" )

		expect( html ).toContain( "/showcases" )
		expect( html ).toContain( "/privacy-policy" )
	})

	it("render without the shell's navigation when no shell is marked default", async () => {
		const { html, status } = await website.get( "/no-shell" )

		expect( status ).toBe( 200 )
		expect( html ).toContain( "Shell-less" )
		expect( html ).not.toContain( "/showcases" )
		expect( html ).not.toContain( "/privacy-policy" )
	})

	it("degrade rather than fail when no event is marked main", async () => {
		const { html, status } = await website.get( "/no-event" )

		expect( status ).toBe( 200 )
		// The page itself is intact.
		expect( html ).toContain( "Bare" )
		// The event-derived furniture is simply absent.
		expect( html ).not.toContain( "Register Now" )
		expect( text_of( html ) ).not.toContain( "Dec 2025" )
	})
})

describe("the context colours", () => {
	it("come from the resolved event", async () => {
		const { html } = await website.get( "/about" )

		expect( variables( html ) ).toMatchObject( {
			"--ctx-contributor-color": "255, 92, 35",
			"--ctx-conversation-color": "0, 85, 230",
			"--ctx-experience-color": "0, 225, 182",
			"--ctx-showcase-color": "240, 80, 61",
			"--ctx-theme-color": "0, 85, 230",
			"--ctx-workshop-color": "250, 188, 29",
		} )
	})

	it("come from the entry's own event, while the chrome does not", async () => {
		const { html } = await website.get( "/next-event" )

		expect( variables( html )["--ctx-theme-color"] ).toBe( "27, 127, 75" )
		expect( variables( html )["--ctx-showcase-color"] )
			.toBe( "194, 65, 12" )

		// …and the header above those colours still advertises 2025.
		expect( text_of( html ) ).toContain( "11–14 Dec 2025" )
	})

	it("fall back to a hardcoded palette when no event resolves", async () => {
		const { html } = await website.get( "/no-event" )

		expect( variables( html )["--ctx-theme-color"] ).toBe( "0, 85, 230" )
	})

	it("alias the context colour to the role that matches the page", async () => {
		const { html } = await website.get( "/no-colour-scheme" )

		// A page nobody has answered for takes the theme, which is what every
		// page drew as before there was anything to choose.
		expect( variables( html )["--ctx-context-color"] )
			.toBe( "var(--ctx-theme-color)" )
	})
})

/**
 |
 | The colour scheme.
 |
 | It answers one question — **what the page's context colour is pointed at** —
 | and the assertions are on that one declaration rather than on the blocks
 | below it, because that is the whole mechanism. A block goes on carrying
 | `bg-context` and `text-context` whatever the page is set to; re-pointing the
 | alias is what makes those classes draw something else.
 |
 */
describe("a page's colour scheme", () => {
	it("points the context colour at whichever of the event's colours was chosen", async () => {
		const { html } = await website.get( "/workshop-page" )

		expect( variables( html )["--ctx-context-color"] )
			.toBe( "var(--ctx-workshop-color)" )
	})

	// Black and white are not roles and have no per-event value, so they point
	// at the static palette instead — still a channel triplet, so `bg-context`
	// and its opacity modifiers go on compiling to plain `rgba()`.
	it("points it at the static palette for black and for white", async () => {
		expect(
			variables(
				( await website.get( "/black-page" ) ).html,
			)["--ctx-context-color"],
		)
			.toBe( "var(--color-black)" )

		expect(
			variables(
				( await website.get( "/white-page" ) ).html,
			)["--ctx-context-color"],
		)
			.toBe( "var(--color-white)" )
	})

	// The point of pointing an alias rather than repainting: a block set to
	// the page's own colour says so with the class it has always carried.
	it("changes no class a block carries", async () => {
		const { html } = await website.get( "/black-page" )

		expect( element_carrying( html, "A heading in black" ) )
			.toContain( "text-context" )
	})

	// The six roles keep the values the resolved event gave them whatever the
	// page is set to, because a listing below re-points the alias at one of
	// them per card.
	it("leaves the six roles' own values alone", async () => {
		const { html } = await website.get( "/black-page" )

		expect( variables( html ) ).toMatchObject( {
			"--ctx-theme-color": "0, 85, 230",
			"--ctx-workshop-color": "250, 188, 29",
		} )
	})

	it("does not reach a card, which re-points the alias for itself", async () => {
		const { html } = await website.get( "/mixed-cards" )

		// The page is white and the strip is still two colours: a page's
		// scheme sets where the mechanism starts, and does not replace it.
		expect( html ).toContain(
			"--ctx-context-color:var(--ctx-showcase-color)",
		)
		expect( html ).toContain(
			"--ctx-context-color:var(--ctx-workshop-color)",
		)
	})
})

/**
 |
 | The element carrying a given run of words, with its own attributes.
 |
 | The same helper the catalogue suite uses, for the same reason: a
 | whole-document assertion on a class as common as `text-context` passes
 | whether or not the element under test carries it.
 |
 */
function element_carrying ( html: string, text: string ) {
	const at = html.indexOf( text )

	if ( at < 0 ) {
		return ""
	}

	return html.slice( html.lastIndexOf( "<", at ), at )
}

/**
 |
 | The page with its markup taken out.
 |
 | A date range is two `<time>` elements with a dash between them, so the string
 | a reader sees is never contiguous in the source. What is being asserted is
 | what the page says, not how it is marked up.
 |
 */
function text_of ( html: string ) {
	return html.replace( /<[^>]*>/g, "" )
}

/**
 |
 | The custom properties set on the page's outermost element.
 |
 | Read out of the markup rather than out of a function, because where they are
 | set is half the requirement: a variable declared anywhere above the page's
 | own root would be the same for every page, which is exactly what this
 | replaces.
 |
 */
function variables ( html: string ): Record<string, string> {
	const [ , style ] = /<div [^>]*style="([^"]*--ctx-[^"]*)"/.exec( html )
		?? []

	if ( !style ) {
		return {}
	}

	return Object.fromEntries(
		style
			.split( ";" )
			.map( ( declaration ) => declaration.split( ":" ) )
			.filter( ( parts ) => parts.length === 2 )
			.map( ( [ name, value ] ) => [ name.trim(), value.trim() ] ),
	)
}
