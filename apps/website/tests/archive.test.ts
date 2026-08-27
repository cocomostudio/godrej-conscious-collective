
/**
 |
 | The Archive's two listings, rendered end to end with the CMS stubbed at the
 | fetch boundary.
 |
 | Both of them draw most of what they draw in the browser — a ring that turns,
 | a dialog that opens, a set of slides that only exists above a size — and none
 | of that is reachable from a server-rendered string. So what is asserted here
 | is what the server owes the browser before any of it runs:
 |
 |   • **the whole of the content is in the markup**, for the ring's slides and
 |     for the timeline's rows, because a carousel that renders its slides on
 |     hydration is a blank strip to a crawler and to a reader whose script
 |     failed;
 |
 |   • **the tree below an entry is walked**, which is the one thing about this
 |     pair that no other component in the catalogue exercises — a region inside
 |     a repeatable component, one level deeper than the render tree has ever
 |     gone;
 |
 |   • **an entry with nothing written up offers nothing to open**, which is the
 |     branch an editor meets first and the one a fixture full of content would
 |     never reach.
 |
 | **The dark ground inside the dialog is not asserted here**, and cannot be:
 | the dialog is mounted by a press, so none of it reaches a server-rendered
 | string. It has a file of its own — `dark-surface.test.ts` — which says why it
 | uses a narrower seam than this one.
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
	archive_carousel_listing,
	archive_entry,
	archive_timeline_listing,
	envelope,
	gallery,
	image_and_content,
	image_link,
	quote,
	responsive_image_block,
	section,
	wysiwyg,
} from "./support/envelopes.ts"

let website: Website

const SNAPSHOTS = [
	wysiwyg( "What that year was about." ),
	responsive_image_block( "/uploads/snapshot.png" ),
	quote( "A quotable sentence.", "Somebody, somewhere" ),
	image_and_content( "/uploads/beside.png", [
		wysiwyg( "Words beside a picture." ),
	] ),
	gallery( "equal", "/uploads/left.png", "/uploads/right.png" ),
]

beforeAll( async () => {
	website = await boot_website( {
		"/home": envelope( {
			main_region: [
				section( "The Archives", {
					content: [
						archive_carousel_listing(
							image_link(
								"/archives",
								"Conscious Collective 2025",
								"/uploads/2025.png",
							),
							image_link(
								"/archives",
								"Conscious Collective 2024",
								"/uploads/2024.png",
							),
						),
					],
					heading: { content: "The Archives" },
				} ),
			],
			page_layout: "one-column",
			title: "Home",
		} ),
		"/archives": envelope( {
			main_region: [
				section( "The timeline", {
					content: [
						archive_timeline_listing(
							archive_entry( {
								content: SNAPSHOTS,
								description:
									"The year we reclaimed cool.",
								images: [
									"/uploads/one.png",
									"/uploads/two.png",
									"/uploads/three.png",
								],
								name: "Reclaiming Cool",
								year: "2025",
							} ),
							archive_entry( {
								description: "Grown rather than made.",
								images: [
									"/uploads/four.png",
									"/uploads/five.png",
									"/uploads/six.png",
								],
								name: "Grown, Not Made",
								year: "2024",
							} ),
						),
					],
				} ),
			],
			standfirst: "Relive the experience over the years.",
			title: "Archives",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("the archive carousel listing", () => {
	it("renders every slide on the server, not on hydration", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		expect( body ).toContain( "Conscious Collective 2025" )
		expect( body ).toContain( "Conscious Collective 2024" )
		expect( body ).toContain( "/uploads/2025.png" )
		expect( body ).toContain( "/uploads/2024.png" )
	})

	it("repeats the slides so the ring has something to wrap onto", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		// Two repetitions before the browser measures — a looping track needs
		// content on both sides of the viewport, and an editor may have given
		// it two slides. Everything after the first set is hidden from
		// assistive technology, so the ring is read once and turns forever.
		expect( occurrences( body, "/uploads/2025.png" ) )
			.toBeGreaterThan( 1 )
		expect( body ).toContain( "aria-hidden=\"true\"" )
	})

	it("leaves the heading and the link to the section", async () => {
		const body = body_of( ( await website.get( "/" ) ).html )

		// The ring holds slides and nothing else. If it ever grew a heading of
		// its own there would be two on the page.
		expect( occurrences( body, "The Archives" ) ).toBe( 1 )
	})

	it("renders nothing at all when an editor has added no slides", async () => {
		const empty = await boot_website( {
			"/empty": envelope( {
				main_region: [
					section( "The Archives", {
						content: [ archive_carousel_listing() ],
					} ),
				],
				title: "Empty",
			} ),
		} )

		try {
			const body = body_of( ( await empty.get( "/empty" ) ).html )

			expect( body ).not.toContain( "View the next archived event" )
		}
		finally {
			await empty.stop()
		}
	})
})

describe("the archive timeline listing", () => {
	it("renders every entry, with its year, name, words and pictures", async () => {
		const body = body_of( ( await website.get( "/archives" ) ).html )

		expect( body ).toContain( "2025" )
		expect( body ).toContain( "Reclaiming Cool" )
		expect( body ).toContain( "The year we reclaimed cool." )
		expect( body ).toContain( "/uploads/one.png" )
		expect( body ).toContain( "/uploads/three.png" )

		expect( body ).toContain( "2024" )
		expect( body ).toContain( "Grown, Not Made" )
	})

	it("counts its own entries rather than restating a typed number", async () => {
		const body = body_of( ( await website.get( "/archives" ) ).html )

		expect( body ).toContain( "2 Events" )
	})

	it("ranks the edition's name below its year", async () => {
		const body = body_of( ( await website.get( "/archives" ) ).html )

		// The year is the row's own heading and the name sits one level under
		// it. Both are the same size in the design, so nothing but the markup
		// says which is which — and both ranks follow from how deeply the
		// listing is nested rather than from a number anybody typed.
		const headings = [
			...body.matchAll( /<h([1-6])[^>]*>([^<]*)<\/h\1>/g ),
		]
			.map( ( found ) => ( {
				rank: Number( found[1] ),
				words: found[2],
			} ) )

		const year = headings.find( ( found ) => found.words === "2025" )
		const name = headings.find( ( found ) =>
			found.words === "Reclaiming Cool"
		)

		expect( year ).toBeDefined()
		expect( name ).toBeDefined()
		expect( name!.rank ).toBe( year!.rank + 1 )
	})

	/**
	 |
	 | **The spine is drawn in the page's own colour, not the event's theme.**
	 |
	 | It used to read the theme directly, which is right on a page nobody could
	 | recolour and wrong on one whose editor has chosen a scheme: the timeline
	 | would be the one thing on such a page still drawn in the old colour.
	 |
	 | Both fades are custom properties on the list and both the dot and the
	 | line are classes on a row, so a class name is the only seam either has —
	 | the same argument the card hover suite makes at greater length.
	 |
	 */
	it("draws its spine and its fades in the page's own colour", async () => {
		const body = body_of( ( await website.get( "/archives" ) ).html )

		const fades = /style="(--archive-spine-fade[^"]*)"/.exec( body )?.[1]
			?? ""

		expect( fades ).toContain( "--ctx-context-color" )
		expect( fades ).not.toContain( "--ctx-theme-color" )

		// Scoped to the spine itself: the chrome's Register Now button is
		// `bg-theme` on every page of the site, so a whole-body assertion
		// would fail on furniture that has nothing to do with the timeline.
		const spine = spine_of( body )

		expect( spine ).toContain( "border-context" )
		expect( spine ).toContain( "bg-context" )
		expect( spine ).not.toContain( "-theme" )
	})

	it("draws the way in to the snapshots in it too", async () => {
		const body = body_of( ( await website.get( "/archives" ) ).html )

		const affordance = /class="([^"]*)"[^>]*>\s*See Snapshots/.exec( body )

		expect( affordance?.[1] ).toContain( "text-context" )
	})

	it("renders nothing at all when an editor has added no entries", async () => {
		const empty = await boot_website( {
			"/empty": envelope( {
				main_region: [
					section( "The timeline", {
						content: [ archive_timeline_listing() ],
					} ),
				],
				title: "Empty",
			} ),
		} )

		try {
			const body = body_of( ( await empty.get( "/empty" ) ).html )

			expect( body ).not.toContain( "Events" )
		}
		finally {
			await empty.stop()
		}
	})
})

describe("an entry's snapshots", () => {
	it("offer nothing to open where nobody has written any", async () => {
		const body = body_of( ( await website.get( "/archives" ) ).html )

		// One button, for the one entry that has content. An edition nobody
		// has written up is the ordinary case, and a control that opens an
		// empty dialog is worse than no control.
		expect( occurrences( body, "See Snapshots" ) ).toBe( 1 )
		expect( body ).toContain(
			"View more info about Reclaiming Cool held in 2025",
		)
		expect( body ).not.toContain(
			"View more info about Grown, Not Made held in 2024",
		)
	})

	it("are not in the markup until the dialog is opened", async () => {
		const body = body_of( ( await website.get( "/archives" ) ).html )

		// The dialog is mounted by a press, so nothing inside it is server
		// rendered. That is a cost worth being explicit about: the snapshots
		// are not indexed, and the timeline row is what a crawler sees.
		expect( body ).not.toContain( "What that year was about." )
		expect( body ).not.toContain( "A quotable sentence." )
	})
})

function body_of ( html: string ) {
	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}

function occurrences ( haystack: string, needle: string ) {
	return haystack.split( needle ).length - 1
}

/**
 |
 | The spine of one row — the dot and the line running out of it — found by the
 | sideways fade, which nothing else on the page declares.
 |
 */
function spine_of ( body: string ) {
	const at = body.indexOf( "--archive-spine-fade-sideways))]" )

	return at < 0 ? "" : body.slice( at, body.indexOf( "</div>", at ) )
}
