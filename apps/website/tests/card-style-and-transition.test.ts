
/**
 |
 | How a card answers a pointer.
 |
 | `style_and_transition` is an attribute on all three card listings, and the
 | two values are the two ways the design lets a card react: the details panel
 | floods with the category's colour and the points go black, or the points
 | alone take the colour up. Nothing else about the card differs, which is why
 | one attribute rather than two components.
 |
 | The assertions are on class names, which is unusual for this suite and is the
 | only seam a hover has: it is a `:hover` rule and there is no such thing as a
 | server-rendered pointer. What they are really pinning is the **mechanism** —
 | that every card rebinds `--ctx-context-color` to its own category, so the one
 | `context` token paints in four colours down a single page. A card that lost
 | that rebinding would keep every class below and draw them all in the page's
 | colour.
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
	responsive_image,
	section,
	session_card,
	session_list,
	session_listing,
	session_listing_with_filtration,
} from "./support/envelopes.ts"

let website: Website

const SHOWCASE = session_card( {
	category: "Showcase",
	cover: responsive_image( "https://pictures.test/land.jpg" ),
	name: "Living with the Land",
	path: "/sessions/living-with-the-land",
	price: 1599,
} )

const WORKSHOP = session_card( {
	category: "Workshop",
	name: "Cooling Pots in Clay",
	path: "/sessions/cooling-pots-in-clay",
} )

beforeAll( async () => {
	website = await boot_website( {
		"/filling": envelope( {
			main_region: [
				section( "Showcases", {
					content: [
						session_listing(
							"Showcase",
							[ SHOWCASE ],
							1,
							"change-fill-on-hover",
						),
					],
				} ),
			],
			title: "Filling",
		} ),

		// The third card listing, which the other two cannot answer for: it
		// draws its cards through the filtration provider rather than
		// directly, so the attribute has one more hop to survive.
		"/filtered": envelope( {
			main_region: [
				section( "Showcases", {
					content: [
						session_listing_with_filtration(
							"Showcase",
							[ SHOWCASE ],
							"change-fill-on-hover",
						),
					],
				} ),
			],
			title: "Filtered",
		} ),

		"/mixed": envelope( {
			main_region: [
				section( "You might also like", {
					content: [ session_list( [ SHOWCASE, WORKSHOP ] ) ],
				} ),
			],
			title: "Mixed",
		} ),

		"/stroking": envelope( {
			main_region: [
				section( "Showcases", {
					content: [
						session_listing(
							"Showcase",
							[ SHOWCASE ],
							1,
							"change-stroke-on-hover",
						),
					],
				} ),
			],
			title: "Stroking",
		} ),

		"/unset": envelope( {
			main_region: [
				section( "Showcases", {
					content: [
						session_listing( "Showcase", [ SHOWCASE ], 1 ),
					],
				} ),
			],
			title: "Unset",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("every card, whichever treatment it wears", () => {
	// The rebinding is the whole mechanism. Without it `bg-context` on a card
	// is the *page's* colour, and a page of four categories draws four
	// identical cards.
	it("points the context colour at its own category", async () => {
		const body = body_of( ( await website.get( "/mixed" ) ).html )

		expect( body ).toContain(
			"--ctx-context-color:var(--ctx-showcase-color)",
		)
		expect( body ).toContain(
			"--ctx-context-color:var(--ctx-workshop-color)",
		)
	})

	// Under the card's own `overflow-hidden`, so what grows is clipped rather
	// than pushing the details panel down.
	it("grows its picture a little", async () => {
		const body = body_of( ( await website.get( "/mixed" ) ).html )

		expect( body ).toContain( "group-hover:scale-105" )
	})
})

describe("change-fill-on-hover", () => {
	it("floods the details panel and turns the points black", async () => {
		const body = body_of( ( await website.get( "/filling" ) ).html )

		expect( body ).toContain( "group-hover:bg-context" )
		expect( body ).toContain( "group-hover:text-black" )
	})

	// The points are the category's colour before a pointer arrives — the
	// inverse of the stroke treatment, which starts them black and takes them
	// up to it.
	it("leaves the points in the category colour at rest", async () => {
		const body = body_of( ( await website.get( "/filling" ) ).html )

		expect( points_of( body ) ).toContain( "text-context" )
	})

	// **The listing with a filtration widget draws its cards through the
	// provider** rather than straight at them, so the attribute has one more
	// hop to survive there — and the way an attribute shared by three
	// listings goes wrong is that two carry it down and the third quietly
	// does not. It is asked for explicitly here, because a value equal to the
	// default proves nothing about having travelled.
	it("reaches a card in the listing that filters, too", async () => {
		const body = body_of( ( await website.get( "/filtered" ) ).html )

		expect( body ).toContain( "group-hover:bg-context" )
		expect( points_of( body ) ).toContain( "text-context" )
	})
})

describe("change-stroke-on-hover", () => {
	it("takes the points up to the category colour from black", async () => {
		const body = body_of( ( await website.get( "/stroking" ) ).html )

		const points = points_of( body )

		expect( points ).toContain( "text-black" )
		expect( points ).toContain( "group-hover:text-context" )
	})

	it("leaves the details panel white throughout", async () => {
		const body = body_of( ( await website.get( "/stroking" ) ).html )

		expect( body ).not.toContain( "group-hover:bg-context" )
	})

	// **It is the default, and a schema default is written when a row is
	// written rather than read when one is read** — so every listing saved
	// before the attribute existed comes back with nothing in it, and nothing
	// has to draw as this rather than as the other one.
	it("is what a listing with no choice recorded gets", async () => {
		const body = body_of( ( await website.get( "/unset" ) ).html )

		expect( points_of( body ) ).toContain( "text-black" )
		expect( points_of( body ) ).toContain( "group-hover:text-context" )
		expect( body ).not.toContain( "group-hover:bg-context" )
	})
})

/**
 |
 | The card's points list, on its own. The classes under test are the ones on
 | this element, and `text-black` appears all over a card — the title is one —
 | so a whole-body assertion would pass without the points having moved at all.
 |
 */
function points_of ( body: string ) {
	const found = body.match( /class="points[^"]*"/ )

	return found ? found[0] : ""
}

function body_of ( html: string ) {
	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}
