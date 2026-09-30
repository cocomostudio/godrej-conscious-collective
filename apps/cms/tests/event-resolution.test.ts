
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

describe("an event's palette", () => {
	it("arrives as RGB channel triplets beside the colours themselves", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )
		const event = body.data.resolved_event

		expect( event.theme.base__color ).toBe( "#0055E6" )
		expect( event.theme.base__color__rgb ).toBe( "0, 85, 230" )
		expect( event.showcase.base__color__rgb ).toBe( "240, 80, 61" )
		expect( event.experience.base__color__rgb ).toBe( "0, 225, 182" )
		expect( event.conversation.base__color__rgb ).toBe( "0, 85, 230" )
		expect( event.workshop.base__color__rgb ).toBe( "250, 188, 29" )
		expect( event.contributor.base__color__rgb ).toBe( "255, 92, 35" )
	})

	it("carries the button colours' triplets too", async () => {
		const { body } = await cms.get( "/api/envelope?path=/about" )
		const showcase = body.data.resolved_event.showcase

		expect( showcase.solid_button_fill__hover__color ).toBe( "#D02510" )
		expect( showcase.solid_button_fill__hover__color__rgb )
			.toBe( "208, 37, 16" )
		expect( showcase.outline_button_text__active__color__rgb )
			.toBe( "238, 59, 37" )
	})

	it("reaches the chrome through the main event as well", async () => {
		const { body } = await cms.get(
			"/api/envelope?path=/conscious-collective-2029",
		)

		expect( body.data.main_event.theme.base__color__rgb )
			.toBe( "0, 85, 230" )
		expect( body.data.resolved_event.theme.base__color )
			.toBe( "#5B71A1" )
	})

	it("fills every triplet a saved colour has, base and buttons alike", async () => {
		const event = await create_event( {
			contributor: {
				base__color: "#123456",
				outline_button_border__color: "#000000",
				solid_button_fill__active__color: "#FFFFFF",
			},
		} )

		expect( await stored_palette( event.documentId, "contributor" ) )
			.toMatchObject( {
				base__color__rgb: "18, 52, 86",
				outline_button_border__color__rgb: "0, 0, 0",
				solid_button_fill__active__color__rgb: "255, 255, 255",
			} )
	})

	it("leaves the triplet of a button colour nobody set empty", async () => {
		const event = await create_event( {
			theme: { base__color: "#123456" },
		} )

		const theme = await stored_palette( event.documentId, "theme" )

		expect( theme.solid_button_fill__color ).toBeNull()
		expect( theme.solid_button_fill__color__rgb ).toBeNull()
		expect( theme.outline_button_text__hover__color__rgb ).toBeNull()
	})

	it("re-derive the triplet when a colour is edited", async () => {
		const event = await create_event( {
			theme: { base__color: "#FFFFFF" },
		} )

		// With the component's own id, the way the admin saves a form: the
		// row is edited in place rather than replaced by a fresh one.
		const { id } = await stored_palette( event.documentId, "theme" )

		await cms.strapi.documents( EVENT ).update( {
			data: { theme: { base__color: "#123456", id } },
			documentId: event.documentId,
		} )

		expect( await stored_palette( event.documentId, "theme" ) )
			.toMatchObject( { base__color__rgb: "18, 52, 86" } )
	})

	it("clear the triplet when a button colour itself is cleared", async () => {
		const event = await create_event( {
			theme: {
				base__color: "#123456",
				solid_button_fill__color: "#654321",
			},
		} )

		const { id } = await stored_palette( event.documentId, "theme" )

		await cms.strapi.documents( EVENT ).update( {
			data: {
				theme: {
					base__color: "#123456",
					id,
					solid_button_fill__color: null,
				},
			},
			documentId: event.documentId,
		} )

		expect( await stored_palette( event.documentId, "theme" ) )
			.toMatchObject( { solid_button_fill__color__rgb: null } )
	})

	it("leave a triplet alone when its colour is not part of the save", async () => {
		const event = await create_event( {
			theme: { base__color: "#123456" },
		} )

		await cms.strapi.documents( EVENT ).update( {
			data: { name: "Renamed, nothing else" },
			documentId: event.documentId,
		} )

		expect( await stored_palette( event.documentId, "theme" ) )
			.toMatchObject( { base__color__rgb: "18, 52, 86" } )
	})
})

/**
 |
 | What the seed leaves behind, read back rather than restated: the 2027 values
 | come off the design's button-state image, and the 2029 ones are a second,
 | harmonious palette, so that a seeded site shows palettes belonging to an
 | event rather than to the site.
 |
 */
describe("the seeded events", () => {
	const PALETTE_2027 = {
		conversation: [ "#0055E6", "#003999", "#004BCC", "#004BCC" ],
		contributor: [ "#FF5C23", "#D63700", "#FF4A0A", "#FF4A0A" ],
		experience: [ "#00E1B6", "#009478", "#00C7A1", "#00C7A1" ],
		showcase: [ "#F0503D", "#D02510", "#EE3B25", "#EE3B25" ],
		theme: [ "#0055E6", "#003999", "#004BCC", "#003999" ],
		workshop: [ "#FABC1D", "#C89104", "#F9B506", "#F9B506" ],
	}

	const PALETTE_2029 = {
		conversation: [ "#2E7D8F", "#0B6677", "#1F7183", "#1F7183" ],
		contributor: [ "#86628F", "#6F4B77", "#7A5783", "#7A5783" ],
		experience: [ "#537E54", "#3C673E", "#487249", "#487249" ],
		showcase: [ "#9B5F5A", "#824844", "#8E534F", "#8E534F" ],
		theme: [ "#5B71A1", "#455A88", "#4F6594", "#4F6594" ],
		workshop: [ "#8D6B39", "#755421", "#815F2D", "#815F2D" ],
	}

	it.each( [
		[ MAIN_EVENT_NAME, PALETTE_2027 ],
		[ OTHER_EVENT_NAME, PALETTE_2029 ],
	] )( "%s carries its palette's hex values", async ( name, palette ) => {
		const event = await seeded_event( name )

		for (
			const [ role, [ rest, hover, pressed, border_hover ] ] of Object
				.entries( palette )
		) {
			expect( { colours: event[role], role } ).toMatchObject( {
				colours: {
					base__color: rest,
					outline_button_border__active__color: pressed,
					outline_button_border__color: rest,
					outline_button_border__hover__color: hover,
					outline_button_text__active__color: pressed,
					outline_button_text__color: rest,
					outline_button_text__hover__color: hover,
					solid_button_border__active__color: pressed,
					solid_button_border__color: rest,
					solid_button_border__hover__color: border_hover,
					solid_button_fill__active__color: pressed,
					solid_button_fill__color: rest,
					solid_button_fill__hover__color: hover,
				},
				role,
			} )
		}
	} )
})

/**
 |
 | The event form, as the content manager stored it on boot. A boot that got
 | this far has already validated every declaration against its attributes, so
 | what is asserted here is only what an editor meets.
 |
 */
describe("the event form", () => {
	const store = () =>
		cms.strapi.store( { name: "content_manager", type: "plugin" } )

	it("labels the contributor box \"Collaborator\"", async () => {
		const stored = await store().get( {
			key: "configuration_content_types::api::event.event",
		} )

		expect( stored.metadatas.contributor.edit.label ).toBe(
			"Collaborator",
		)
	})

	it("lays a palette colour out as its base, then each button part's three states", async () => {
		const stored = await store().get( {
			key: "configuration_components::event.palette-colour-v1",
		} )

		expect(
			stored.layouts.edit.map( ( row: { name: string }[] ) =>
				row.map( ( field ) => field.name )
			),
		).toEqual( [
			[ "base__color" ],
			[
				"outline_button_border__color",
				"outline_button_border__hover__color",
				"outline_button_border__active__color",
			],
			[
				"outline_button_text__color",
				"outline_button_text__hover__color",
				"outline_button_text__active__color",
			],
			[
				"solid_button_border__color",
				"solid_button_border__hover__color",
				"solid_button_border__active__color",
			],
			[
				"solid_button_fill__color",
				"solid_button_fill__hover__color",
				"solid_button_fill__active__color",
			],
		] )
		expect( stored.metadatas.solid_button_fill__hover__color.edit.label )
			.toMatch( /solid.*fill.*hover|hover.*solid.*fill/i )
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

async function stored_palette ( documentId: string, role: string ) {
	const row = await cms.strapi.db.query( EVENT ).findOne( {
		populate: { [role]: true },
		where: { documentId },
	} )

	return row?.[role]
}

async function seeded_event ( name: string ) {
	return await cms.strapi.db.query( EVENT ).findOne( {
		populate: {
			contributor: true,
			conversation: true,
			experience: true,
			showcase: true,
			theme: true,
			workshop: true,
		},
		where: { name },
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
