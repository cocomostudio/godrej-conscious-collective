
/**
 |
 | A carousel's previous and next buttons, rendered end to end, driven over
 | HTTP with the CMS stubbed at the socket.
 |
 | A heading immediately followed by a carousel gets the two buttons in its
 | own row. So does a section that opens with a carousel and has no heading,
 | in a row of the buttons alone. Nothing else gets them.
 |
 | What this seam holds is **where** the buttons are and that they are in the
 | server's HTML at all, before any script has run. That they move the
 | carousel, and where they sit in pixels, is the browser's to show.
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
	archive_carousel_listing,
	contributor_card,
	contributor_listing,
	envelope,
	heading,
	image_link,
	instagram_feed,
	section,
	session_card,
	session_list,
	session_listing,
	wysiwyg,
} from "./support/envelopes.ts"

let website: Website

const PREVIOUS = "aria-label=\"Previous\""
const NEXT = "aria-label=\"Next\""

function cards ( count: number ) {
	return Array.from( { length: count }, ( _unused, index ) =>
		session_card( {
			name: `Controlled ${String.fromCharCode( 65 + index )}`,
			path: `/sessions/controlled-${index}`,
		} ) )
}

function page ( ...main_region: ReturnType<typeof section>[] ) {
	return envelope( { main_region, page_layout: "one-column", title: "Page" } )
}

beforeAll( async () => {
	website = await boot_website( {
		"/section-heading": page(
			section( "Showcases", {
				content: [ session_listing( "Showcase", cards( 5 ) ) ],
				heading: {
					content: "Showcases",
					link: {
						label: "View All",
						style: "plain",
						url: "/all",
					},
				},
				opening_line: { content: "Things to watch." },
			} ),
		),

		"/section-heading-without-a-link": page(
			section( "Showcases", {
				content: [ session_listing( "Showcase", cards( 5 ) ) ],
				heading: { content: "Showcases" },
			} ),
		),

		"/standalone-heading": page(
			section( "Related", {
				content: [
					heading( "You might also like" ),
					session_list( cards( 6 ) ),
				],
			} ),
		),

		"/headless-section": page(
			section( "Collaborators", {
				content: [
					contributor_listing( "carousel", [
						contributor_card( { name: "Kaveri Nair" } ),
						contributor_card( { name: "Rahul Bose" } ),
					] ),
				],
			} ),
		),

		"/instagram": page(
			section( "Instagram", {
				content: [
					instagram_feed(
						image_link( "/a", "A", "/uploads/a.png" ),
						image_link( "/b", "B", "/uploads/b.png" ),
					),
				],
				heading: { content: "On Instagram" },
			} ),
		),

		"/not-a-carousel": page(
			section( "Showcases", {
				content: [ session_listing( "Showcase", cards( 3 ) ) ],
				heading: { content: "Showcases" },
			} ),
			section( "Related", {
				content: [ heading( "Read on" ), wysiwyg( "Some words." ) ],
			} ),
		),

		"/a-carousel-further-down": page(
			section( "Showcases", {
				content: [
					wysiwyg( "Some words first." ),
					session_listing( "Showcase", cards( 5 ) ),
				],
				heading: { content: "Showcases" },
			} ),
		),

		"/archive": page(
			section( "Past editions", {
				content: [
					archive_carousel_listing(
						image_link( "/2025", "2025", "/uploads/a.png" ),
						image_link( "/2024", "2024", "/uploads/b.png" ),
					),
				],
				heading: { content: "Past editions" },
			} ),
		),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("a heading followed by a carousel", () => {
	it("carries both buttons when it is the section's own", async () => {
		const body = await body_at( "/section-heading" )

		expect( body ).toContain( PREVIOUS )
		expect( body ).toContain( NEXT )
	})

	// The link, then the buttons: the pair closes the heading's row.
	it("sets the buttons after the link, and the opening line in the same row", async () => {
		const body = await body_at( "/section-heading" )

		expect( body.indexOf( "View All" ) ).toBeLessThan(
			body.indexOf( PREVIOUS ),
		)
		expect( body.indexOf( "Things to watch." ) )
			.toBeLessThan( body.indexOf( PREVIOUS ) )
		expect( body.indexOf( PREVIOUS ) ).toBeLessThan( body.indexOf( NEXT ) )
		expect( body.indexOf( NEXT ) )
			.toBeLessThan( body.indexOf( "Controlled A" ) )
	})

	it("carries them without a link, too", async () => {
		const body = await body_at( "/section-heading-without-a-link" )

		expect( body ).toContain( PREVIOUS )
		expect( body ).toContain( NEXT )
	})

	it("carries them when it is a heading block of its own", async () => {
		const body = await body_at( "/standalone-heading" )

		expect( body.indexOf( "You might also like" ) )
			.toBeLessThan( body.indexOf( PREVIOUS ) )
		expect( body.indexOf( NEXT ) )
			.toBeLessThan( body.indexOf( "Controlled A" ) )
	})

	it("carries them over the Instagram feed", async () => {
		expect( await body_at( "/instagram" ) ).toContain( PREVIOUS )
	})
})

describe("a section that opens with a carousel and has no heading", () => {
	it("carries the buttons in a row of their own, above the carousel", async () => {
		const body = await body_at( "/headless-section" )

		expect( body ).toContain( PREVIOUS )
		expect( body.indexOf( NEXT ) ).toBeLessThan(
			body.indexOf( "Kaveri Nair" ),
		)
	})
})

describe("everything else", () => {
	it("has no buttons over a listing that does not turn, nor beside a heading over words", async () => {
		expect( await body_at( "/not-a-carousel" ) ).not.toContain( PREVIOUS )
	})

	it("has no buttons over a carousel the heading is not immediately above", async () => {
		expect( await body_at( "/a-carousel-further-down" ) )
			.not.toContain( PREVIOUS )
	})

	// The archive carousel keeps its own controls, at its foot.
	it("has no buttons in the heading row over the archive carousel", async () => {
		expect( await body_at( "/archive" ) ).not.toContain( PREVIOUS )
	})
})

async function body_at ( path: string ) {
	return body_of( ( await website.get( path ) ).html )
}

/**
 |
 | The server's markup alone. React Router streams the loader's data back as a
 | script, so every string the CMS sent is in the response whether it was
 | rendered or not — and a button that only a script drew would not be here.
 |
 */
function body_of ( html: string ) {
	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}
