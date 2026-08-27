
/**
 |
 | Event resolution, and the middlewares that keep it answerable.
 |
 | Two things are being watched here, and they are the same thing seen from
 | either end. The envelope's two event slots are read over HTTP, because that
 | is what the website consumes. The middlewares are read through **subsequent
 | reads** — a write, then a look at what is stored — because a middleware
 | called directly proves nothing about whether it is in the chain, and because
 | the failure this project actually has is silence: an event that quietly stays
 | main, a triplet that quietly stays null.
 |
 | Writes go through `strapi.documents`, which is the boundary the admin itself
 | writes through. There is no HTTP route that creates an Event and there should
 | not be one — an Event is never public, and granting a create permission to
 | the Public role for the sake of a test would be testing something nobody does.
 |
 | The order of the blocks below is load-bearing. Everything that reads the
 | seeded arrangement comes first; everything that changes which event is main
 | comes after, and puts it back.
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

const EVENT = "api::event.event"
const PAGE = "api::page.page"
const PAGE_SHELL = "api::page-shell.page-shell"

const MAIN_EVENT_NAME = "Conscious Collective 2027"
const OTHER_EVENT_NAME = "Conscious Collective 2029"

let cms: Seeded_Cms

beforeAll( async () => {
	cms = await boot_seeded_cms()
} )

afterAll( async () => {
	await cms?.destroy()
} )

describe("the site chrome", () => {
	it("reads the main event on a page that names no event of its own", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		expect( body.data.main_event.name ).toBe( MAIN_EVENT_NAME )
		expect( body.data.main_event.date_start ).toBe( "2027-12-11" )
		expect( body.data.main_event.date_end ).toBe( "2027-12-13" )
	})

	it("reads the main event on an archived page", async () => {
		// The chrome follows the main event on every page, always, including
		// archived ones — which is the decision's accepted downside rather than
		// an oversight: an archived page advertises an event other than the
		// one it describes.
		const { body } = await cms.get( "/api/envelope?path=/archive-2023" )

		expect( body.data.entry.is_archived ).toBe( true )
		expect( body.data.main_event.name ).toBe( MAIN_EVENT_NAME )
	})

	it("reads the main event on a page belonging to another event", async () => {
		const { body } = await cms.get(
			"/api/envelope?path=/conscious-collective-2029",
		)

		expect( body.data.main_event.name ).toBe( MAIN_EVENT_NAME )
	})
})

describe("the resolved event", () => {
	it("is the main event when the entry names none", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		expect( body.data.resolved_event.name ).toBe( MAIN_EVENT_NAME )
	})

	it("is the entry's own event when it names one", async () => {
		const { body } = await cms.get(
			"/api/envelope?path=/conscious-collective-2029",
		)

		expect( body.data.resolved_event.name ).toBe( OTHER_EVENT_NAME )
	})

	it("carries the schedule document, so a page can offer it", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		// Populated rather than a bare relation id. The seed uploads no file,
		// so what matters is that the branch is there to hold one.
		expect( body.data.resolved_event ).toHaveProperty( "schedule" )
	})

	it("does not travel nested inside the entry as well", async () => {
		const { body } = await cms.get(
			"/api/envelope?path=/conscious-collective-2029",
		)

		expect( body.data.entry.event ).toBeUndefined()
	})
})

describe("an event's colours", () => {
	it("arrive as RGB channel triplets beside the colours themselves", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )
		const event = body.data.resolved_event

		expect( event.colour_theme ).toBe( "#0055E6" )
		expect( event.colour_theme_rgb ).toBe( "0, 85, 230" )
		expect( event.colour_showcase_rgb ).toBe( "240, 80, 61" )
		expect( event.colour_experience_rgb ).toBe( "0, 225, 182" )
		expect( event.colour_conversation_rgb ).toBe( "0, 85, 230" )
		expect( event.colour_workshop_rgb ).toBe( "250, 188, 29" )
		expect( event.colour_contributor_rgb ).toBe( "255, 92, 35" )
	})

	it("re-derive the triplet when a colour is edited", async () => {
		const event = await create_event( { colour_theme: "#FFFFFF" } )

		await cms.strapi.documents( EVENT ).update( {
			data: { colour_theme: "#123456" },
			documentId: event.documentId,
		} )

		expect( await stored_event( event.documentId ) ).toMatchObject( {
			colour_theme_rgb: "18, 52, 86",
		} )
	})

	it("clear the triplet when the colour itself is cleared", async () => {
		const event = await create_event( { colour_theme: "#123456" } )

		await cms.strapi.documents( EVENT ).update( {
			data: { colour_theme: null },
			documentId: event.documentId,
		} )

		expect( await stored_event( event.documentId ) ).toMatchObject( {
			colour_theme_rgb: null,
		} )
	})

	it("leave a triplet alone when its colour is not part of the save", async () => {
		const event = await create_event( { colour_theme: "#123456" } )

		await cms.strapi.documents( EVENT ).update( {
			data: { name: "Renamed, nothing else" },
			documentId: event.documentId,
		} )

		expect( await stored_event( event.documentId ) ).toMatchObject( {
			colour_theme_rgb: "18, 52, 86",
		} )
	})
})

describe("an inverted date range", () => {
	it("is refused on creation", async () => {
		await expect( create_event( {
			date_end: "2026-01-01",
			date_start: "2026-02-01",
		} ) ).rejects.toThrow( /falls after/ )
	})

	it("is refused when an edit inverts a range that was valid", async () => {
		const event = await create_event( {
			date_end: "2026-02-01",
			date_start: "2026-01-01",
		} )

		await expect(
			cms.strapi.documents( EVENT ).update( {
				data: { date_start: "2026-03-01" },
				documentId: event.documentId,
			} ),
		).rejects.toThrow( /falls after/ )

		// Refused before the write, not after it: the write's transaction opens
		// inside `next()`, so a middleware that threw afterwards would leave
		// this row holding the date it just rejected.
		expect( await stored_event( event.documentId ) ).toMatchObject( {
			date_start: "2026-01-01",
		} )
	})

	it("permits a single-day event", async () => {
		const event = await create_event( {
			date_end: "2026-01-01",
			date_start: "2026-01-01",
		} )

		expect( event.documentId ).toBeTruthy()
	})
})

describe("the default page shell", () => {
	it("fills an entry that was created without one", async () => {
		const page = await cms.strapi.documents( PAGE ).create( {
			data: { title: "Created With No Shell" },
		} )

		expect( await page_shell_of( page.documentId ) ).toBe( "Primary" )
	})

	it("fills a create that mentions the attribute but names nothing", async () => {
		// The shape the admin sends for a relation the editor never touched.
		// It is neither a value nor an absence, and on a create there is no
		// previous value for it to mean "unchanged" about.
		const page = await cms.strapi.documents( PAGE ).create( {
			data: {
				page_shell: { connect: [], disconnect: [] },
				title: "Created The Way The Admin Creates",
			},
		} )

		expect( await page_shell_of( page.documentId ) ).toBe( "Primary" )
	})

	it("leaves that same shape alone on an update", async () => {
		const archive = await page_shell_named( "Archive" )

		const page = await cms.strapi.documents( PAGE ).create( {
			data: {
				page_shell: archive.documentId,
				title: "Saved The Way The Admin Saves",
			},
		} )

		await cms.strapi.documents( PAGE ).update( {
			data: {
				page_shell: { connect: [], disconnect: [] },
				standfirst: "Edited, and the relation left as it was.",
			},
			documentId: page.documentId,
		} )

		expect( await page_shell_of( page.documentId ) ).toBe( "Archive" )
	})

	it("fills an entry whose shell was cleared", async () => {
		const archive = await page_shell_named( "Archive" )

		const page = await cms.strapi.documents( PAGE ).create( {
			data: {
				page_shell: archive.documentId,
				title: "Created With The Archive Shell",
			},
		} )

		await cms.strapi.documents( PAGE ).update( {
			data: { page_shell: null },
			documentId: page.documentId,
		} )

		expect( await page_shell_of( page.documentId ) ).toBe( "Primary" )
	})

	it("leaves a shell an editor chose alone on an unrelated save", async () => {
		const archive = await page_shell_named( "Archive" )

		const page = await cms.strapi.documents( PAGE ).create( {
			data: {
				page_shell: archive.documentId,
				title: "Keeps Its Own Shell",
			},
		} )

		await cms.strapi.documents( PAGE ).update( {
			data: { standfirst: "Edited, but not its shell." },
			documentId: page.documentId,
		} )

		expect( await page_shell_of( page.documentId ) ).toBe( "Archive" )
	})

	it("moves to whichever shell is marked default next", async () => {
		const archive = await page_shell_named( "Archive" )

		await cms.strapi.documents( PAGE_SHELL ).update( {
			data: { default: true },
			documentId: archive.documentId,
		} )

		expect( await default_page_shell_names() ).toEqual( [ "Archive" ] )

		const page = await cms.strapi.documents( PAGE ).create( {
			data: { title: "Created After The Default Moved" },
		} )

		expect( await page_shell_of( page.documentId ) ).toBe( "Archive" )

		// Put it back, because everything after this reads the seeded
		// arrangement.
		await cms.strapi.documents( PAGE_SHELL ).update( {
			data: { default: true },
			documentId: ( await page_shell_named( "Primary" ) ).documentId,
		} )

		expect( await default_page_shell_names() ).toEqual( [ "Primary" ] )
	})
})

describe("marking an event as main", () => {
	it("demotes whichever event was main before", async () => {
		const promoted = await create_event( { main: true } )

		expect( await main_event_names() ).toEqual( [ promoted.name ] )
	})

	it("leaves the site chrome reading the event that now holds it", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )

		expect( body.data.main_event.name ).not.toBe( MAIN_EVENT_NAME )
	})

	it("degrades the chrome rather than failing it when no event is main", async () => {
		await cms.strapi.db.query( EVENT ).updateMany( {
			data: { main: false },
			where: { main: true },
		} )

		const { body, status } = await cms.get( "/api/envelope?path=/about" )

		expect( status ).toBe( 200 )
		expect( body.data.main_event ).toBeNull()
		expect( body.data.resolved_event ).toBeNull()
	})

	it("still resolves a page that names its own event", async () => {
		const { body } = await cms.get(
			"/api/envelope?path=/conscious-collective-2029",
		)

		expect( body.data.main_event ).toBeNull()
		expect( body.data.resolved_event.name ).toBe( OTHER_EVENT_NAME )
	})
})

let events_created = 0

async function create_event ( data: Record<string, unknown> = {} ) {
	events_created += 1

	return await cms.strapi.documents( EVENT ).create( {
		data: { name: `Test Event ${events_created}`, ...data },
	} )
}

/**
 |
 | Straight out of the database, because the point of every assertion above is
 | what was **stored** — not what the caller sent and not what the document
 | service echoed back.
 |
 */
async function stored_event ( documentId: string ) {
	return await cms.strapi.db.query( EVENT ).findOne( {
		where: { documentId },
	} )
}

async function main_event_names () {
	const rows = await cms.strapi.db.query( EVENT ).findMany( {
		select: [ "name" ],
		where: { main: true },
	} )

	return rows.map( ( row: { name: string } ) => row.name )
}

async function default_page_shell_names () {
	const rows = await cms.strapi.db.query( PAGE_SHELL ).findMany( {
		select: [ "name" ],
		where: { default: true },
	} )

	return rows.map( ( row: { name: string } ) => row.name )
}

async function page_shell_named ( name: string ) {
	const [ shell ] = await cms.strapi.documents( PAGE_SHELL ).findMany( {
		filters: { name },
	} )

	return shell
}

async function page_shell_of ( documentId: string ) {
	const page = await cms.strapi.documents( PAGE ).findOne( {
		documentId,
		populate: { page_shell: true },
		status: "draft",
	} )

	return page?.page_shell?.name ?? null
}
