
/**
 |
 | Listings, rendered end to end, driven over HTTP with the CMS stubbed at the
 | fetch boundary.
 |
 | Two things are worth asserting here and nowhere else.
 |
 | **That a listing block cannot tell a curated listing from an automatic one.**
 | The CMS resolves both into the same narrowed rows, so every fixture below
 | hands the block rows — and the curated and the automatic tests use the same
 | row builder, because that is the contract.
 |
 | **That all four category renderings survived the collapse into one
 | component.** One schema, one registry entry, one populate fragment and one
 | seed branch replaced eight of each, and the way that goes wrong is quietly:
 | four categories that all come out looking like the plainest one. Each is
 | pinned by something only that rendering does.
 |
 | The home page is asked for as `/`, and the CMS stub answers it under `/home`
 | — a Page titled "Home" resolves to `/home`, the website tries the incoming
 | path first and falls back, and `/home` itself redirects to `/` permanently.
 |
 | `body_of` strips the hydration payload, for the reason the other files give:
 | React Router streams the loader's data back down as a script, so every string
 | the CMS sent is in the response whether it was rendered or not.
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
	contributor_card,
	contributor_listing,
	envelope,
	responsive_image,
	section,
	session_card,
	session_list,
	session_listing,
} from "./support/envelopes.ts"

let website: Website

const SHOWCASES = [
	session_card( {
		category: "Showcase",
		contributors: [ { name: "Debasmita Ghosh" }, {
			name: "Arthur Mensah",
		} ],
		cover: responsive_image( "https://pictures.test/land.jpg" ),
		name: "Living with the Land",
		path: "/sessions/living-with-the-land",
		price: 1599,
		session_date_first: "2025-12-11",
		session_date_last: "2025-12-14",
	} ),
	session_card( {
		age_group: "Children",
		category: "Showcase",
		name: "The Force Within",
		path: "/sessions/the-force-within",
		price: 0,
	} ),
]

beforeAll( async () => {
	website = await boot_website( {
		"/collaborators": envelope( {
			main_region: [
				section( "Collaborators", {
					content: [
						contributor_listing( "grid", [
							contributor_card( {
								name: "Debasmita Ghosh",
								path: "/collaborators/debasmita-ghosh",
								role: "Installation artist",
							} ),
							contributor_card( { name: "Priya Menon" } ),
						] ),
					],
				} ),
			],
			title: "Collaborators",
		} ),

		"/home": envelope( {
			main_region: [
				section( "Showcases", {
					content: [ session_listing( "Showcase", SHOWCASES ) ],
				} ),
				section( "Experiences", {
					content: [
						session_listing( "Experience", [
							session_card( {
								category: "Experience",
								name: "The Shade Garden",
								path: "/sessions/the-shade-garden",
							} ),
						] ),
					],
				} ),
				section( "Conversations", {
					content: [
						session_listing( "Conversation", [
							session_card( {
								category: "Conversation",
								name: "Who Pays for Cool",
								path: "/sessions/who-pays-for-cool",
							} ),
						] ),
					],
				} ),
				section( "Workshops", {
					content: [
						session_listing( "Workshop", [
							session_card( {
								category: "Workshop",
								name: "Cooling Pots in Clay",
								path: "/sessions/cooling-pots-in-clay",
								standfirst:
									"Throw a pot that keeps water cold.",
							} ),
							session_card( {
								category: "Workshop",
								name: "Reading a Site for Heat",
								path: "/sessions/reading-a-site-for-heat",
							} ),
						] ),
					],
				} ),
				section( "Collaborators", {
					content: [
						contributor_listing( "carousel", [
							contributor_card( { name: "Kaveri Nair" } ),
							contributor_card( { name: "Rahul Bose" } ),
						] ),
					],
				} ),
			],
			title: "Home",
		} ),

		"/nothing-on": envelope( {
			main_region: [
				section( "Showcases", {
					content: [ session_listing( "Showcase", [] ) ],
				} ),
			],
			title: "Nothing On",
		} ),

		"/related": envelope( {
			main_region: [
				section( "You might also like", {
					content: [ session_list( SHOWCASES ) ],
				} ),
			],
			title: "Related",
		} ),

		"/unaliased": envelope( {
			main_region: [
				section( "Showcases", {
					content: [
						session_listing( "Showcase", [
							session_card( {
								name: "No URL Yet",
								path: null,
							} ),
						] ),
					],
				} ),
			],
			title: "Unaliased",
		} ),

		"/whats-on": envelope( {
			main_region: [
				section( "Showcases", {
					content: [ session_listing( "Showcase", SHOWCASES ) ],
				} ),
				section( "Workshops", {
					content: [
						session_listing( "Workshop", [
							session_card( { category: "Workshop" } ),
						] ),
					],
				} ),
				section( "Collaborators", {
					content: [
						contributor_listing( "grid", [
							contributor_card(),
						] ),
					],
				} ),
			],
			title: "What's On",
		} ),

		"/who": envelope( {
			main_region: [
				section( "Who is behind it", {
					content: [
						contributor_listing( "natural", [
							contributor_card( { name: "Iris Han" } ),
						] ),
					],
				} ),
			],
			title: "Who",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("a card", () => {
	it("says who it is by, who it is for and what it costs", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( body ).toContain( "Living with the Land" )
		expect( body ).toContain( "by Debasmita Ghosh X Arthur Mensah" )
		expect( body ).toContain( "All Ages" )
		expect( body ).toContain( "₹ 1599" )
	})

	it("reads zero as Free, and shows no price where none was set", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( body ).toContain( "Free" )

		// "The Shade Garden" has no price at all, so nothing stands where one
		// would — a visitor who sees a blank there assumes it is missing.
		expect( body ).not.toContain( "₹ null" )
	})

	it("links to the session it names", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( body ).toContain( "href=\"/sessions/living-with-the-land\"" )
	})

	// A session whose URL has not been generated is a real state, and a card
	// that stayed pressable would take a visitor to a 404.
	it("is not pressable when there is nothing to link to", async () => {
		const body = body_of( ( await website.get( "/unaliased" ) ).html )

		expect( body ).toContain( "No URL Yet" )
		expect( body ).not.toContain( "href=\"null\"" )
		expect( body ).not.toContain( "href=\"undefined\"" )
	})

	// Split rather than parsed: a `Date` built from a bare day is midnight UTC,
	// and west of it the 11th reads as the 10th.
	it("dates itself from the day the editor typed", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		// React emits the attribute as it is named in JSX; HTML parses attribute
		// names case-insensitively, so this is `datetime` to a browser.
		expect( body ).toContain( "Dec" )
		expect( body ).toContain( "dateTime=\"2025-12-11\"" )
		expect( body ).toContain( "dateTime=\"2025-12-14\"" )
	})

	// A heading marks a section of the page being read. A card is a link to a
	// different page, so ten cards would put ten entries in the heading outline
	// that lead nowhere in this one — and a reader jumping between section
	// headings would wade through the listings to find them.
	it("does not put its name in the document outline", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( body ).toContain( "Living with the Land" )
		expect( body ).not.toMatch( /<h[1-6][^>]*>\s*Living with the Land/ )
		expect( body ).not.toMatch( /<h[1-6][^>]*>\s*Kaveri Nair/ )
	})

	// Nothing invented where an editor uploaded nothing: a stand-in picture
	// says nothing about the session it stands in for.
	it("shows an empty frame where a session has no cover", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( body ).not.toContain( "bg-mesh-gradient" )
	})

	it("draws the cover the session carries", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( body ).toContain( "https://pictures.test/land.jpg" )
	})
})

describe("the four category renderings", () => {
	// The two looping rows repeat their slides so the loop has something to
	// wrap onto, and hide every repetition after the first from assistive
	// technology. Nothing else in the catalogue renders a card twice.
	it("turn showcases and conversations, and repeat the slides to do it", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( occurrences( body, "Living with the Land" ) )
			.toBeGreaterThan( 1 )
		expect( occurrences( body, "Who Pays for Cool" ) ).toBeGreaterThan( 1 )
		expect( body ).toContain( "aria-hidden=\"true\"" )
	})

	// Few enough of them that a carousel would be an affordance with nothing
	// behind it.
	it("set experiences in a plain row, drawn once", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( occurrences( body, "The Shade Garden" ) ).toBe( 1 )
	})

	it("feature the first workshop and no other", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( occurrences( body, "card--featured" ) ).toBe( 1 )

		// Its standfirst rides along, hidden until the medium breakpoint,
		// where `card--featured` reveals it.
		expect( body ).toContain( "Throw a pot that keeps water cold." )
		expect( body ).toContain( "additional-details" )
	})

	// **By re-pointing the context colour, not by naming the category.** Every
	// card on the page carries the same handful of classes and aims the alias
	// at its own category on its own element, which is what lets four
	// categories side by side draw four colours. See `context_colour_of`.
	it("paint every card in its own category's colour", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		for (
			const colour of [
				"--ctx-context-color:var(--ctx-showcase-color)",
				"--ctx-context-color:var(--ctx-experience-color)",
				"--ctx-context-color:var(--ctx-conversation-color)",
				"--ctx-context-color:var(--ctx-workshop-color)",
			]
		) {
			expect( body ).toContain( colour )
		}
	})
})

describe("a curated session list", () => {
	it("draws the same card an automatic listing does", async () => {
		const body = body_of( ( await website.get( "/related" ) ).html )

		expect( body ).toContain( "Living with the Land" )
		expect( body ).toContain( "by Debasmita Ghosh X Arthur Mensah" )
		expect( body ).toContain( "href=\"/sessions/living-with-the-land\"" )
	})

	it("keeps the order the editor dragged them into", async () => {
		const body = body_of( ( await website.get( "/related" ) ).html )

		expect( body.indexOf( "Living with the Land" ) )
			.toBeLessThan( body.indexOf( "The Force Within" ) )
	})

	// Two columns from the medium breakpoint, which is the static site's own
	// arrangement for this strip and the one thing that distinguishes it.
	it("sets them two across rather than in a track", async () => {
		const body = body_of( ( await website.get( "/related" ) ).html )

		expect( body ).toContain( "md:grid-cols-2" )
		expect( occurrences( body, "Living with the Land" ) ).toBe( 1 )
	})
})

describe("the three collaborator layouts", () => {
	it("fill the width in a grid", async () => {
		const body = body_of( ( await website.get( "/collaborators" ) ).html )

		expect( body ).toContain( "Debasmita Ghosh" )
		expect( body ).toContain( "Installation artist" )
		expect( body ).toContain( "href=\"/collaborators/debasmita-ghosh\"" )
		expect( body ).toContain( "md:grid-cols-3" )
	})

	it("wrap a plain row when the layout is natural", async () => {
		const body = body_of( ( await website.get( "/who" ) ).html )

		expect( body ).toContain( "Iris Han" )
		expect( body ).toContain( "flex-wrap" )
		expect( occurrences( body, "Iris Han" ) ).toBe( 1 )
	})

	it("turn a ring when the layout is a carousel", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		// Repeated for the loop, which is what makes it a ring rather than a
		// row: the other two layouts draw each collaborator once.
		expect( occurrences( body, "Kaveri Nair" ) ).toBeGreaterThan( 1 )
	})

	// **The ring is turned by swiping it and by nothing else.** It had a pair
	// of chevrons above it, lifted from the static site, and they are gone.
	it("turn without a pair of controls above them", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( body ).not.toContain( "View the previous collaborator" )
		expect( body ).not.toContain( "View the next collaborator" )
	})
})

// The listings are resolved inside the envelope route and spliced into the
// entry before it answers, so a page holding three of them still costs the
// website one request — which is the whole reason the response can be cached
// by pathname and fronted by a CDN later.
describe("a page holding several listings", () => {
	it("is still one request to the CMS", async () => {
		website.cms.requests.length = 0

		const { status } = await website.get( "/whats-on" )

		expect( status ).toBe( 200 )
		expect( website.cms.requests ).toEqual( [
			"/whats-on?status=published",
		] )
	})

	it("draws every one of them", async () => {
		const body = body_of( ( await website.get( "/whats-on" ) ).html )

		expect( body ).toContain( "Living with the Land" )
		expect( body ).toContain( "card--featured" )
		expect( body ).toContain( "md:grid-cols-3" )
	})
})

describe("a listing with nothing in it", () => {
	// An empty listing is a real state — a category with nothing published in
	// this event yet — and the section around it should not be left holding an
	// empty track with its own spacing.
	it("renders nothing at all", async () => {
		const { html, status } = await website.get( "/nothing-on" )

		expect( status ).toBe( 200 )
		expect( body_of( html ) ).not.toContain( "card--featured" )
		expect( body_of( html ) ).not.toContain( "points" )
	})
})

function body_of ( html: string ) {
	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}

function occurrences ( haystack: string, needle: string ) {
	return haystack.split( needle ).length - 1
}
