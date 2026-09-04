
/**
 |
 | A collaborator page, rendered end to end, driven over HTTP with the CMS
 | stubbed at the fetch boundary.
 |
 | The contributor is the second content type whose page is not simply its
 | regions: like a session it carries a block with no component behind it,
 | built from top-level attributes. The ContributorProfile in the main column
 | owns the portrait-and-prose split; the sidebar carries the back link, the
 | name and the role.
 |
 | **The name and the role are written twice and each copy is hidden at one
 | width** — the sidebar's below the medium breakpoint, the profile's above it.
 | The tests below read the classes, because that is where the whole of the
 | arrangement is: two copies in the markup, one on screen.
 |
 | `body_of` strips the hydration payload, for the same reason `session-pages`
 | strips it: React Router streams the loader's data back down as a script, so
 | every string the CMS sent is in the response whether it was rendered or
 | not.
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
	image,
} from "./support/envelopes.ts"

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		"/collaborators/debasmita-ghosh": contributor_envelope( {
			blurb: [
				{
					children: [
						{
							text: "Debasmita Ghosh is an installation artist "
								+ "working at the edge of craft and climate.",
							type: "text",
						},
					],
					type: "paragraph",
				},
				{
					children: [
						{
							text: "She spent three years with the Kondh community "
								+ "in Odisha.",
							type: "text",
						},
					],
					type: "paragraph",
				},
			],
			image: image( "https://pictures.test/debasmita.jpg", {
				alt: "Debasmita Ghosh at the pergola",
			} ),
			name: "Debasmita Ghosh",
			role: "Installation artist",
		} ),

		"/collaborators/no-picture": contributor_envelope( {
			blurb: [ {
				children: [
					{ text: "No image uploaded yet.", type: "text" },
				],
				type: "paragraph",
			} ],
			name: "No Picture",
			role: "Curator",
		} ),

		"/collaborators/no-role": contributor_envelope( {
			name: "No Role",
			role: null,
		} ),

		"/collaborators/other-year": contributor_envelope( {
			name: "Kaveri Nair",
			role: "Curator",
		}, {
			resolved_event: event( {
				colour_contributor_rgb: "9, 9, 9",
				main: false,
				name: "Conscious Collective 2027",
			} ),
		} ),

		// A Page, for the comparisons that only mean anything side by side.
		"/about": envelope( {
			title: "About",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("the profile", () => {
	it("shows the name, the role, the image and the prose", async () => {
		const body = body_of(
			( await website.get( "/collaborators/debasmita-ghosh" ) ).html,
		)

		expect( body ).toContain( "Debasmita Ghosh" )
		expect( body ).toContain( "Installation artist" )
		expect( body ).toContain( "https://pictures.test/debasmita.jpg" )
		expect( body ).toContain( "Debasmita Ghosh at the pergola" )
		expect( body ).toContain( "installation artist working at the edge" )
		expect( body ).toContain( "three years with the Kondh community" )
	})

	it("draws the name and the role under the portrait as prose", async () => {
		// Prose, not headings: the sidebar carries the document's h1 at every
		// width, and these two are what a visitor reads in its place from the
		// medium breakpoint up.
		const body = body_of(
			( await website.get( "/collaborators/debasmita-ghosh" ) ).html,
		)

		expect( body ).toMatch(
			/<p class="max-md:hidden[^"]*"[^>]*>Debasmita Ghosh<\/p>/,
		)
		expect( body ).toMatch(
			/<p class="max-md:hidden[^"]*"[^>]*>Installation artist<\/p>/,
		)
	})

	it("names the document after the collaborator", async () => {
		const { html } = await website.get( "/collaborators/debasmita-ghosh" )

		expect( html ).toContain(
			"<title>Debasmita Ghosh — Godrej Conscious Collective</title>",
		)
	})

	it("renders without an image", async () => {
		const { html, status } = await website.get(
			"/collaborators/no-picture",
		)

		expect( status ).toBe( 200 )

		const body = body_of( html )

		expect( body ).toContain( "No Picture" )
		expect( body ).toContain( "Curator" )
	})
})

describe("the sidebar", () => {
	it("opens with the back link to the collaborators listing", async () => {
		const body = body_of(
			( await website.get( "/collaborators/debasmita-ghosh" ) ).html,
		)

		expect( body ).toContain( "All Collaborators" )
		expect( body ).toContain( `href="/collaborators"` )
	})

	it("carries nothing else — no side region, no table of contents", async () => {
		const body = body_of(
			( await website.get( "/collaborators/debasmita-ghosh" ) ).html,
		)

		expect( body ).not.toContain( `aria-label="On this page"` )
		expect( body ).not.toContain( "Add to Calendar" )
	})

	it("carries the page's only h1, and it is the collaborator's name", async () => {
		// The name is written twice — here and under the portrait — and only
		// one of the two is a heading. The other is prose, so a second copy of
		// the words is not a second first heading.
		const body = body_of(
			( await website.get( "/collaborators/debasmita-ghosh" ) ).html,
		)

		expect( [ ...body.matchAll( /<h1[\s>]/g ) ].length ).toBe( 1 )
		expect( body ).toMatch( /<h1[^>]*>Debasmita Ghosh<\/h1>/ )
		expect( [ ...body.matchAll( />Debasmita Ghosh</g ) ].length ).toBe( 2 )
	})

	it("shows the name and the role only below the medium breakpoint", async () => {
		const body = body_of(
			( await website.get( "/collaborators/debasmita-ghosh" ) ).html,
		)

		// `sr-only` rather than `hidden`: the h1 stops being painted up there,
		// it does not leave the accessibility tree.
		expect( body ).toContain( `class="mt-4 md:sr-only"` )
		expect( body ).toMatch(
			/<p class="mt-4 text-p [^"]*"[^>]*>Installation artist<\/p>/,
		)
	})

	it("draws its band in the contributor colour at that width", async () => {
		// White words on the contributor colour below the medium breakpoint,
		// grey beside the content above it — and the back link goes with them.
		const body = body_of(
			( await website.get( "/collaborators/debasmita-ghosh" ) ).html,
		)

		expect( body ).toContain( "max-md:bg-context md:bg-gray-light" )
		expect( body ).toContain( "max-md:text-white md:text-context" )
	})

	it("renders without a role", async () => {
		const { html, status } = await website.get(
			"/collaborators/no-role",
		)

		expect( status ).toBe( 200 )
		expect( body_of( html ) ).toMatch( /<h1[^>]*>No Role<\/h1>/ )
	})
})

describe("the page's colours", () => {
	it("point the context at the contributor colour", async () => {
		const { html } = await website.get( "/collaborators/debasmita-ghosh" )

		expect( html ).toContain(
			"--ctx-context-color:var(--ctx-contributor-color)",
		)
	})

	it("follow the resolved event, not the main one", async () => {
		const { html } = await website.get( "/collaborators/other-year" )

		expect( html ).toContain( "--ctx-contributor-color:9, 9, 9" )
	})
})

/**
 |
 | **One column is not something a collaborator can be.** The content type
 | carries no `page_layout` attribute, so there is no setting for an editor to
 | get wrong — a page with no sidebar would leave a visitor with no way back
 | to the listing.
 |
 */
describe("a collaborator", () => {
	it("always has its sidebar, whatever else the envelope carries", async () => {
		const body = body_of(
			( await website.get( "/collaborators/no-picture" ) ).html,
		)

		expect( body ).toContain( "All Collaborators" )
	})
})

function body_of ( html: string ) {
	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}
