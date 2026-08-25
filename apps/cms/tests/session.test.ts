
/**
 |
 | A session, over HTTP, against a seeded database.
 |
 | The same seam and the same reason as the envelope's own tests: a session's
 | page is assembled from more top-level attributes than any other content type
 | holds, and every one of them is invisible in a response that quietly left it
 | out. The middlewares are observed through a subsequent read rather than
 | called.
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
	type Seeded_Cms,
	boot_seeded_cms,
} from "./support/boot-seeded-cms.ts"

const SHOWCASE = "/api/envelope?path=/sessions/living-with-the-land"

let cms: Seeded_Cms

beforeAll( async () => {
	cms = await boot_seeded_cms()
} )

afterAll( async () => {
	await cms?.destroy()
} )

describe("a session's envelope", () => {
	it("carries every attribute its page is built from", async () => {
		const { body, status } = await cms.get( SHOWCASE )

		expect( status ).toBe( 200 )

		const { entry } = body.data

		expect( entry.contentType ).toBe( "api::session.session" )
		expect( entry.name ).toBe( "Living with the Land" )
		expect( entry.standfirst ).toContain( "A two-part showcase" )
		expect( entry.category ).toBe( "Showcase" )
		expect( entry.age_group ).toBe( "All" )
		expect( entry.all_day_event ).toBe( true )
		expect( entry.price ).toBe( 1599 )
		expect( entry.checkout_url ).toBe(
			"https://example.com/cc/living-with-the-land",
		)
	})

	it("populates the cover, the venue and every instance", async () => {
		const { body } = await cms.get( SHOWCASE )
		const { entry } = body.data

		expect( entry.cover.small.url ).toMatch( /^https?:\/\// )
		expect( entry.venue.label ).toBe( "Outdoor Pergola" )
		expect( entry.venue.url ).toBe( "https://example.com/maps/pergola" )

		// The showcase runs across three days and carries one instance each.
		expect( entry.instances.length ).toBe( 3 )

		for ( const instance of entry.instances ) {
			expect( typeof instance.time_start ).toBe( "string" )
			expect( typeof instance.time_end ).toBe( "string" )
		}
	})

	it("reaches the bottom of its render tree", async () => {
		const { body } = await cms.get( SHOWCASE )
		const sections = body.data.entry.main_region

		// The showcase takes template A of the round-robin sample content:
		// two sections, a heading and an opening line, prose, a gallery and
		// a quote — exercising a leaf two levels down.
		expect( sections.length ).toBe( 2 )
		expect( sections[0].__component ).toBe( "container.section-v1" )
		expect( sections[0].heading.content ).toBe( "About the Work" )
		expect( sections[0].content[0].__component ).toBe(
			"text.plain-string-v1",
		)

		// A leaf two levels down, with its own component attributes populated.
		const gallery = sections[0].content.find( ( block ) =>
			block.__component === "media.gallery-v1"
		)

		expect( gallery.images.length ).toBe( 2 )
		expect( gallery.layout ).toBe( "equal" )
		expect( gallery.images[0].url ).toMatch( /^https?:\/\// )
	})

	it("resolves to the session's own event, not the main one", async () => {
		const { body } = await cms.get(
			"/api/envelope?path=/sessions/notes-for-2027",
		)

		expect( body.data.resolved_event.name ).toBe(
			"Conscious Collective 2027",
		)
		expect( body.data.main_event.name ).toBe( "Conscious Collective 2025" )
	})

	it("does not serve an unpublished session", async () => {
		const path = "/api/envelope?path=/sessions/unannounced-showcase"

		expect( ( await cms.get( path ) ).status ).toBe( 404 )
		expect( ( await cms.get( `${path}&status=draft` ) ).status ).toBe(
			200,
		)
	})
})

describe("a session's derived dates", () => {
	it("follow the date portions of its instances", async () => {
		const { body } = await cms.get( SHOWCASE )

		expect( body.data.entry.session_date_first ).toBe( "2025-12-11" )
		expect( body.data.entry.session_date_last ).toBe( "2025-12-13" )
	})

	it("follow a change to those instances", async () => {
		const session = await find_session( "Designing for Heat" )

		await cms.strapi.documents( "api::session.session" ).update( {
			data: {
				instances: [
					{
						time_end: "2025-12-09T13:00:00.000+05:30",
						time_start: "2025-12-09T12:00:00.000+05:30",
					},
					{
						time_end: "2025-12-16T13:00:00.000+05:30",
						time_start: "2025-12-16T12:00:00.000+05:30",
					},
				],
			},
			documentId: session.documentId,
		} )

		const changed = await find_session( "Designing for Heat" )

		expect( changed.session_date_first ).toBe( "2025-12-09" )
		expect( changed.session_date_last ).toBe( "2025-12-16" )
	})

	it("survives a write that says nothing about the instances", async () => {
		const before = await find_session( "The Cooling Pergola" )

		await cms.strapi.documents( "api::session.session" ).update( {
			data: { price: 275 },
			documentId: before.documentId,
		} )

		const after = await find_session( "The Cooling Pergola" )

		expect( after.price ).toBe( 275 )
		expect( after.session_date_first ).toBe( before.session_date_first )
		expect( after.session_date_last ).toBe( before.session_date_last )
	})
})

/**
 |
 | Every date and time in this content model is a wall-clock time in the
 | city the event runs in. A value that does not say where it is means there, and
 | not UTC — which is what JavaScript would answer for a bare day, and not the
 | runtime's own zone, which is what it would answer for a bare datetime.
 |
 */
describe("a datetime that does not say where it is", () => {
	it("means the event's city, not UTC and not the server's zone", async () => {
		const created = await cms.strapi.documents( "api::session.session" )
			.create( {
				data: {
					category: "Workshop",
					instances: [ {
						time_end: "2025-12-27T13:00:00",
						time_start: "2025-12-27T11:00:00",
					} ],
					name: "Eleven In The Morning",
				},
				status: "published",
			} )

		const stored = await cms.strapi.documents( "api::session.session" )
			.findOne( {
				documentId: created.documentId,
				populate: { instances: true },
				status: "draft",
			} )

		// Eleven in Mumbai is half past five in the morning, UTC.
		expect( new Date( stored.instances[0].time_start ).toISOString() )
			.toBe( "2025-12-27T05:30:00.000Z" )
		expect( new Date( stored.instances[0].time_end ).toISOString() )
			.toBe( "2025-12-27T07:30:00.000Z" )
	})

	it("leaves a value that does say where it is exactly as it arrived", async () => {
		const created = await cms.strapi.documents( "api::session.session" )
			.create( {
				data: {
					category: "Workshop",
					instances: [ {
						time_end: "2025-12-27T13:00:00.000Z",
						time_start: "2025-12-27T11:00:00.000Z",
					} ],
					name: "Eleven Zulu",
				},
				status: "published",
			} )

		const stored = await cms.strapi.documents( "api::session.session" )
			.findOne( {
				documentId: created.documentId,
				populate: { instances: true },
				status: "draft",
			} )

		expect( new Date( stored.instances[0].time_start ).toISOString() )
			.toBe( "2025-12-27T11:00:00.000Z" )
	})

	/**
	 |
	 | The one that would go wrong silently. A bare day is midnight **UTC** by
	 | specification, which is half past five in the morning in Mumbai — so a
	 | session written as running on the 27th would derive its date as the 27th
	 | only by luck of which side of midnight the offset lands on.
	 |
	 */
	it("puts a bare day at midnight there, so the derived date is that day", async () => {
		const created = await cms.strapi.documents( "api::session.session" )
			.create( {
				data: {
					category: "Workshop",
					instances: [ {
						time_end: "2025-12-27T23:59:00",
						time_start: "2025-12-27",
					} ],
					name: "A Bare Day",
				},
				status: "published",
			} )

		const stored = await cms.strapi.documents( "api::session.session" )
			.findOne( {
				documentId: created.documentId,
				populate: { instances: true },
				status: "draft",
			} )

		expect( new Date( stored.instances[0].time_start ).toISOString() )
			.toBe( "2025-12-26T18:30:00.000Z" )
		expect( stored.session_date_first ).toBe( "2025-12-27" )
		expect( stored.session_date_last ).toBe( "2025-12-27" )
	})
})

describe("a session's event", () => {
	it("is the main event when the editor named none", async () => {
		const session = await find_session( "Repairing What You Own" )

		expect( session.event?.name ).toBe( "Conscious Collective 2025" )
	})

	it("is left alone on a later save", async () => {
		const session = await find_session( "Notes for 2027" )

		await cms.strapi.documents( "api::session.session" ).update( {
			data: { standfirst: "Changed." },
			documentId: session.documentId,
		} )

		expect( ( await find_session( "Notes for 2027" ) ).event?.name )
			.toBe( "Conscious Collective 2027" )
	})

	/**
	 |
	 | The pair of them together is the invariant: a session never silently has
	 | no event, and it never silently has whichever event happens to be main
	 | later. With no main event to fall back on, the requirement is what is
	 | left, and it refuses the save rather than letting the session through.
	 |
	 */
	it("is required, so with no main event the save is refused", async () => {
		const main = await find_event( "Conscious Collective 2025" )

		await cms.strapi.documents( "api::event.event" ).update( {
			data: { main: false },
			documentId: main.documentId,
		} )

		try {
			await expect(
				cms.strapi.documents( "api::session.session" ).create( {
					data: {
						category: "Workshop",
						instances: [ {
							time_end: "2025-12-14T11:00:00.000+05:30",
							time_start: "2025-12-14T10:00:00.000+05:30",
						} ],
						name: "Eventless",
					},
					status: "published",
				} ),
			).rejects.toThrow()
		}
		finally {
			await cms.strapi.documents( "api::event.event" ).update( {
				data: { main: true },
				documentId: main.documentId,
			} )
		}
	})
})

describe("a session's instances", () => {
	it("cannot be empty", async () => {
		await expect(
			cms.strapi.documents( "api::session.session" ).create( {
				data: {
					category: "Workshop",
					instances: [],
					name: "No Sittings",
				},
				status: "published",
			} ),
		).rejects.toThrow()
	})
})

async function find_event ( name: string ) {
	return await cms.strapi.documents( "api::event.event" ).findFirst( {
		filters: { name },
	} )
}

async function find_session ( name: string ) {
	return await cms.strapi.documents( "api::session.session" ).findFirst( {
		filters: { name },
		populate: { event: true },
		status: "draft",
	} )
}
