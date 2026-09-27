
/**
 |
 | Request ticket and Download, over HTTP: what the admin's disk receives.
 |
 | Every assertion is on the answer to Request ticket or on the bytes of the
 | CSV, the two things the admin panel sees.
 |
 */

import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest"

import {
	type Fixture_Strapi,
	boot_fixture_strapi,
	SUPER_ADMIN,
} from "./support/boot-fixture-strapi.ts"
import { configure_edit_view } from "./support/edit-view.ts"
import { ARTICLE, CRATE, GADGET, MAKER, WIDGET } from "./support/schemas.ts"

const GADGET_UID = "api::gadget.gadget"
const CRATE_UID = "api::crate.crate"
const MAKER_UID = "api::maker.maker"
const ARTICLE_UID = "api::article.article"
const READ = "plugin::content-manager.explorer.read"

describe("Request ticket", () => {
	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET, widget: WIDGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: GADGET_UID,
				EXPORT_ENTRIES_PRESETS: "2,50",
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )
		token = await cms.login( SUPER_ADMIN.email )

		await seed( cms, GADGET_UID, [
			{ createdAt: "2026-09-20T10:00:00Z", title: "One" },
			{ createdAt: "2026-09-21T10:00:00Z", title: "Two" },
			{ createdAt: "2026-09-22T10:00:00Z", title: "Three" },
		] )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	it("refuses a caller who is not logged in", async () => {
		const { status } = await cms.request( "POST", "/export-entries/tickets", {
			body: latest( 2 ),
		} )

		expect( status ).toBe( 401 )
	})

	it("refuses an admin who cannot read the content-type", async () => {
		const role = await cms.create_role( "No reading", [] )
		const email = await cms.create_admin( "unread@example.com", role )

		const { status } = await request_ticket(
			cms,
			await cms.login( email ),
			latest( 2 ),
		)

		expect( status ).toBe( 403 )
	})

	it("answers 404 for a content-type the plugin is not set up for", async () => {
		const { status } = await request_ticket( cms, token, {
			...latest( 2 ),
			uid: "api::widget.widget",
		} )

		expect( status ).toBe( 404 )
	})

	it.each( [
		[ "a count that is not a preset", { count: 3, kind: "latest" } ],
		[ "an unknown calendar period", { kind: "period", period: "next_week" } ],
		[ "an unknown kind of selection", { kind: "everything" } ],
	] )( "refuses %s", async ( _, selection ) => {
		const { status } = await request_ticket( cms, token, {
			fields: [ "title" ],
			selection,
			uid: GADGET_UID,
		} )

		expect( status ).toBe( 400 )
	})

	it("refuses a field that cannot be exported", async () => {
		const { status } = await request_ticket( cms, token, {
			...latest( 2 ),
			fields: [ "title", "secret_code" ],
		} )

		expect( status ).toBe( 400 )
	})

	it("answers a ticket, the row count and the file name", async () => {
		const { body, status } = await request_ticket( cms, token, latest( 50 ) )

		expect( status ).toBe( 200 )
		expect( body.data ).toEqual( {
			count: 3,
			file_name: `gadgets_latest-50_${today_in_kolkata()}.csv`,
			outcome: "ticket",
			ticket: expect.any( String ),
		} )
	})

	it("answers a ticket of 32 random bytes, encoded for a URL", async () => {
		const first = await request_ticket( cms, token, latest( 50 ) )
		const second = await request_ticket( cms, token, latest( 50 ) )
		const ticket = first.body.data.ticket

		expect( ticket ).toMatch( /^[A-Za-z0-9_-]{43}$/ )
		expect( Buffer.from( ticket, "base64url" ) ).toHaveLength( 32 )
		expect( second.body.data.ticket ).not.toBe( ticket )
	})

	it("answers \"no entries match\", and issues no ticket, when none match", async () => {
		const { body, status } = await request_ticket( cms, token, {
			fields: [ "title" ],
			selection: { kind: "period", period: "last_year" },
			uid: GADGET_UID,
		} )

		expect( status ).toBe( 200 )
		expect( body.data ).toEqual( { outcome: "no_entries" } )
	})
})

describe("Download", () => {
	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: GADGET_UID,
				EXPORT_ENTRIES_PRESETS: "2",
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )
		token = await cms.login( SUPER_ADMIN.email )

		await seed( cms, GADGET_UID, [
			{ createdAt: "2026-09-20T10:00:00Z", title: "One" },
			{ createdAt: "2026-09-21T10:00:00Z", title: "Two" },
		] )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	it("serves the file as a UTF-8 CSV attachment that no browser runs", async () => {
		const { body } = await request_ticket( cms, token, latest( 2 ) )
		const { headers, status } = await download( cms, body.data.ticket )

		expect( status ).toBe( 200 )
		expect( headers.get( "content-type" ) ).toBe( "text/csv; charset=utf-8" )
		expect( headers.get( "content-disposition" ) ).toBe(
			`attachment; filename="${body.data.file_name}"`,
		)
		expect( headers.get( "x-content-type-options" ) ).toBe( "nosniff" )
		expect( headers.get( "cache-control" ) ).toBe( "no-store" )
		expect( headers.get( "x-accel-buffering" ) ).toBe( "no" )
	})

	it("starts with a UTF-8 byte-order mark, and ends every line with CRLF", async () => {
		const { body } = await request_ticket( cms, token, latest( 2 ) )
		const { bytes } = await download( cms, body.data.ticket )
		const text = bytes.toString( "utf8" )

		expect( [ ...bytes.subarray( 0, 3 ) ] ).toEqual( [ 0xEF, 0xBB, 0xBF ] )
		expect( text.split( "\r\n" ) ).toHaveLength( 4 )
		expect( text.replace( /\r\n/g, "" ) ).not.toMatch( /[\r\n]/ )
	})

	it("refuses a ticket it never issued", async () => {
		const { bytes, status } = await download( cms, "made-up" )

		expect( status ).toBe( 401 )
		expect( bytes.toString( "utf8" ) ).not.toContain( "One" )
	})

	it("refuses a ticket that has been used", async () => {
		const { body } = await request_ticket( cms, token, latest( 2 ) )
		await download( cms, body.data.ticket )

		const { status } = await download( cms, body.data.ticket )

		expect( status ).toBe( 401 )
	})

	describe("for an admin who has lost access since asking", () => {
		let reader_role: number

		beforeAll( async () => {
			reader_role = await cms.create_role( "Gadget readers", [
				{ action: READ, conditions: [], subject: GADGET_UID },
			] )
		} )

		it("refuses the ticket of an admin who has been deleted", async () => {
			const email = await cms.create_admin( "deleted@example.com", reader_role )
			const { body } = await request_ticket(
				cms,
				await cms.login( email ),
				latest( 2 ),
			)

			await cms.strapi.service( "admin::user" )
				.deleteById( await admin_id_of( cms, email ) )
			const { bytes, status } = await download( cms, body.data.ticket )

			expect( status ).toBe( 401 )
			expect( bytes.toString( "utf8" ) ).not.toContain( "One" )
		})

		it("refuses the ticket of an admin who has been blocked", async () => {
			const email = await cms.create_admin( "blocked@example.com", reader_role )
			const { body } = await request_ticket(
				cms,
				await cms.login( email ),
				latest( 2 ),
			)

			await cms.strapi.service( "admin::user" )
				.updateById( await admin_id_of( cms, email ), { blocked: true } )
			const { bytes, status } = await download( cms, body.data.ticket )

			expect( status ).toBe( 401 )
			expect( bytes.toString( "utf8" ) ).not.toContain( "One" )
		})

		it("refuses the ticket of an admin who can no longer read the content-type", async () => {
			const role = await cms.create_role( "Former readers", [
				{ action: READ, conditions: [], subject: GADGET_UID },
			] )
			const email = await cms.create_admin( "former@example.com", role )
			const { body } = await request_ticket(
				cms,
				await cms.login( email ),
				latest( 2 ),
			)

			await cms.strapi.service( "admin::role" ).assignPermissions( role, [] )
			const { bytes, status } = await download( cms, body.data.ticket )

			expect( status ).toBe( 403 )
			expect( bytes.toString( "utf8" ) ).not.toContain( "One" )
		})
	})

	describe("with the clock stopped", () => {
		afterEach( () => {
			vi.useRealTimers()
		} )

		it("accepts a ticket used 60 seconds after issue", async () => {
			vi.useFakeTimers( { now: Date.now(), toFake: [ "Date" ] } )
			const { body } = await request_ticket( cms, token, latest( 2 ) )

			vi.setSystemTime( Date.now() + 60_000 )
			const { status } = await download( cms, body.data.ticket )

			expect( status ).toBe( 200 )
		})

		it("refuses a ticket used more than 60 seconds after issue", async () => {
			vi.useFakeTimers( { now: Date.now(), toFake: [ "Date" ] } )
			const { body } = await request_ticket( cms, token, latest( 2 ) )

			vi.setSystemTime( Date.now() + 60_001 )
			const { status } = await download( cms, body.data.ticket )

			expect( status ).toBe( 401 )
		})
	})

	it("logs the admin, the content-type, the selection, the fields and the row count", async () => {
		const info = vi.spyOn( cms.strapi.log, "info" )

		try {
			const { body } = await request_ticket( cms, token, latest( 2 ) )
			await download( cms, body.data.ticket )

			const lines = info.mock.calls.map( ( [ line ] ) => String( line ) )
				.filter( ( line ) => line.includes( "[export-entries]" ) )

			expect( lines ).toHaveLength( 1 )
			expect( lines[0] ).toContain( SUPER_ADMIN.email )
			expect( lines[0] ).toContain( GADGET_UID )
			expect( lines[0] ).toContain( "latest 2" )
			expect( lines[0] ).toContain( "Fields: title" )
			expect( lines[0] ).toContain( "2 rows" )
		} finally {
			info.mockRestore()
		}
	})
})

describe("The CSV", () => {
	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: GADGET_UID,
				EXPORT_ENTRIES_PRESETS: "50",
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )
		token = await cms.login( SUPER_ADMIN.email )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	beforeEach( async () => {
		await cms.strapi.db.query( GADGET_UID ).deleteMany( {} )
	} )

	it("puts the chosen fields in edit-view order under edit-view labels, then the timestamps", async () => {
		await configure_edit_view( cms, token, GADGET_UID, {
			labels: { contact: "Email address", stock: "Units in stock" },
			order: [ "stock", "title", "contact" ],
			removed: [],
		} )
		await seed( cms, GADGET_UID, [ {
			contact: "a@example.com",
			createdAt: "2026-09-20T10:00:00Z",
			stock: 4,
			summary: "Left out",
			title: "Thing",
		} ] )

		const csv = await export_csv( cms, token, {
			...latest( 50 ),
			fields: [ "contact", "title", "stock" ],
		} )

		expect( rows_of( csv ) ).toEqual( [
			[ "Units in stock", "title", "Email address", "Created at", "Updated at" ],
			[ "4", "Thing", "a@example.com", "2026-09-20 15:30", "2026-09-20 15:30" ],
		] )
	})

	it("quotes every cell, and doubles a quote inside one", async () => {
		await seed( cms, GADGET_UID, [ {
			createdAt: "2026-09-20T10:00:00Z",
			title: "Say \"hi\", then\r\nleave",
		} ] )

		const csv = await export_csv( cms, token, latest( 50 ) )

		expect( csv ).toContain( "\"Say \"\"hi\"\", then\r\nleave\"," )
	})

	it.each( [
		[ "=1+2", "'=1+2" ],
		[ "+SUM(A1)", "'+SUM(A1)" ],
		[ "-2+3*A1", "'-2+3*A1" ],
		[ "@SUM(A1)", "'@SUM(A1)" ],
		[ "\tpadded", "'\tpadded" ],
		[ "\rreturned", "'\rreturned" ],
		[ "+91 98765 43210", "+91 98765 43210" ],
		[ "-(022) 555-0101", "-(022) 555-0101" ],
		[ "plain = text", "plain = text" ],
	] )( "writes %j as %j", async ( title, cell ) => {
		await seed( cms, GADGET_UID, [
			{ createdAt: "2026-09-20T10:00:00Z", title },
		] )

		const csv = await export_csv( cms, token, latest( 50 ) )

		expect( rows_of( csv )[1][0] ).toBe( cell )
	})

	it("writes booleans, dates, datetimes, numbers and empty values", async () => {
		await seed( cms, GADGET_UID, [
			{
				checked_at: "2026-09-24T18:45:00Z",
				createdAt: "2026-09-20T10:00:00Z",
				in_stock: true,
				released_on: "2026-09-25",
				stock: -5,
				summary: null,
				updatedAt: "2026-09-23T20:10:00Z",
				weight: -1.5,
			},
			{ createdAt: "2026-09-19T10:00:00Z", in_stock: false },
		] )

		const csv = await export_csv( cms, token, {
			...latest( 50 ),
			fields: [
				"stock",
				"summary",
				"weight",
				"released_on",
				"checked_at",
				"in_stock",
			],
		} )

		expect( rows_of( csv ).slice( 1 ) ).toEqual( [
			[
				"-5",
				"",
				"-1.5",
				"2026-09-25",
				"2026-09-25 00:15",
				"TRUE",
				"2026-09-20 15:30",
				"2026-09-24 01:40",
			],
			[ "", "", "", "", "", "FALSE", "2026-09-19 15:30", "2026-09-19 15:30" ],
		] )
	})
})

describe("Relations and media in the CSV", () => {
	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { article: ARTICLE, crate: CRATE, maker: MAKER },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: CRATE_UID,
				EXPORT_ENTRIES_PRESETS: "50,1200",
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
			server_url: "http://cms.example.test",
		} )
		token = await cms.login( SUPER_ADMIN.email )

		// A maker's code comes first, so it is the display field by default.
		// Pointing the relations at the name proves the setting is honoured.
		await configure_edit_view( cms, token, CRATE_UID, {
			labels: {},
			main_fields: { articles: "headline", maker: "name", suppliers: "name" },
			order: [],
			removed: [],
		} )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	beforeEach( async () => {
		await cms.strapi.db.query( CRATE_UID ).deleteMany( {} )
		await cms.strapi.db.query( MAKER_UID ).deleteMany( {} )
		await cms.strapi.db.query( ARTICLE_UID ).deleteMany( {} )
		await cms.strapi.db.query( "plugin::upload.file" ).deleteMany( {} )
	} )

	it("writes a related entry's display field", async () => {
		const maker = await create_maker( cms, "M-1", "Acme Works" )
		await create_crate( cms, { label: "Crate", maker } )

		const csv = await export_csv( cms, token, crates( [ "label", "maker" ] ) )

		expect( rows_of( csv ) ).toEqual( [
			[ "label", "maker", "Created at", "Updated at" ],
			[ "Crate", "Acme Works", expect.any( String ), expect.any( String ) ],
		] )
	})

	it("joins the display fields of many related entries with \"; \"", async () => {
		const acme = await create_maker( cms, "M-1", "Acme Works" )
		const bolt = await create_maker( cms, "M-2", "Bolt & Sons" )
		await create_crate( cms, { suppliers: [ bolt, acme ] } )

		const csv = await export_csv( cms, token, crates( [ "suppliers" ] ) )

		expect( rows_of( csv )[1][0] ).toBe( "Bolt & Sons; Acme Works" )
	})

	it("writes a file's URL, prefixing a file kept on the server with the server's URL", async () => {
		await create_crate( cms, {
			photo: await create_file( cms, "/uploads/front.png" ),
		} )
		await create_crate( cms, {
			photo: await create_file( cms, "https://cdn.example.com/side.png" ),
		} )

		const csv = await export_csv( cms, token, crates( [ "photo" ] ) )

		expect( titles_of( csv ) ).toEqual( [
			"https://cdn.example.com/side.png",
			"http://cms.example.test/uploads/front.png",
		] )
	})

	it("joins the URLs of many files with \"; \"", async () => {
		const back = await create_file( cms, "https://cdn.example.com/back.png" )
		const top = await create_file( cms, "/uploads/top.png" )
		await create_crate( cms, { gallery: [ back, top ] } )

		const csv = await export_csv( cms, token, crates( [ "gallery" ] ) )

		expect( rows_of( csv )[1][0] ).toBe(
			"https://cdn.example.com/back.png; http://cms.example.test/uploads/top.png",
		)
	})

	it("writes an empty cell for an empty relation or media field", async () => {
		await create_crate( cms, { label: "Empty" } )

		const csv = await export_csv( cms, token, crates( [
			"label",
			"maker",
			"suppliers",
			"photo",
			"gallery",
		] ) )

		expect( rows_of( csv )[1].slice( 0, 5 ) ).toEqual( [
			"Empty",
			"",
			"",
			"",
			"",
		] )
	})

	it("writes a related entry with Draft & Publish once, as its draft", async () => {
		// Strapi links an entry without Draft & Publish to both versions.
		const documentId = crypto.randomUUID().replace( /-/g, "" )
		const articles = cms.strapi.db.query( ARTICLE_UID )
		const draft = await articles.create( {
			data: { documentId, headline: "Edited headline", publishedAt: null },
		} )
		const published = await articles.create( {
			data: { documentId, headline: "Published headline", publishedAt: new Date() },
		} )
		await create_crate( cms, { articles: [ published.id, draft.id ] } )

		const csv = await export_csv( cms, token, crates( [ "articles" ] ) )

		expect( rows_of( csv )[1][0] ).toBe( "Edited headline" )
	})

	it("guards a related entry's display field against running as a formula", async () => {
		const formula = await create_maker( cms, "M-1", "=1+2" )
		const acme = await create_maker( cms, "M-2", "Acme Works" )
		await create_crate( cms, { maker: formula, suppliers: [ formula, acme ] } )

		const csv = await export_csv( cms, token, crates( [ "maker", "suppliers" ] ) )

		expect( rows_of( csv )[1].slice( 0, 2 ) ).toEqual( [
			"'=1+2",
			"'=1+2; Acme Works",
		] )
	})

	it("writes the relations and media of every row, across several batches", async () => {
		const acme = await create_maker( cms, "M-1", "Acme Works" )
		const bolt = await create_maker( cms, "M-2", "Bolt & Sons" )
		const expected: string[][] = []

		for ( let index = 0; index < 1_100; index += 1 ) {
			const label = String( index ).padStart( 4, "0" )
			const maker = index % 2 === 0 ? acme : bolt
			await create_crate( cms, {
				label,
				maker,
				photo: await create_file( cms, `/uploads/${label}.png` ),
			} )
			expected.unshift( [
				label,
				maker === acme ? "Acme Works" : "Bolt & Sons",
				`http://cms.example.test/uploads/${label}.png`,
			] )
		}

		const csv = await export_csv( cms, token, {
			...crates( [ "label", "maker", "photo" ] ),
			selection: { count: 1200, kind: "latest" },
		} )

		expect( rows_of( csv ).slice( 1 ).map( ( row ) => row.slice( 0, 3 ) ) )
			.toEqual( expected )
	})
})

describe("Exporting the latest N entries", () => {
	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: GADGET_UID,
				EXPORT_ENTRIES_PRESETS: "2,50",
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )
		token = await cms.login( SUPER_ADMIN.email )

		await seed( cms, GADGET_UID, [
			{ createdAt: "2026-09-20T10:00:00Z", title: "Oldest" },
			{ createdAt: "2026-09-22T10:00:00Z", title: "Newest" },
			{ createdAt: "2026-09-21T10:00:00Z", title: "Middle" },
		] )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	it("exports the N most recently created entries, newest first", async () => {
		const csv = await export_csv( cms, token, latest( 2 ) )

		expect( rows_of( csv ) ).toEqual( [
			[ "title", "Created at", "Updated at" ],
			[ "Newest", "2026-09-22 15:30", "2026-09-22 15:30" ],
			[ "Middle", "2026-09-21 15:30", "2026-09-21 15:30" ],
		] )
	})

	it("exports every entry when fewer than N exist", async () => {
		const csv = await export_csv( cms, token, latest( 50 ) )

		expect( titles_of( csv ) ).toEqual( [ "Newest", "Middle", "Oldest" ] )
	})
})

/**
 |
 | Each entry is named after the moment it was created, on the wall clock in
 | Kolkata, which runs 5½ hours ahead of UTC. The entries sit on either side of
 | the first moment of a day, a week, a month and a year.
 |
 | "Now" is 01:00 on Thursday 24 September 2026 in Kolkata. That is still
 | 23 September in UTC, so reading the days in UTC gets every period wrong.
 |
 */
describe("Exporting a calendar period, in a timezone ahead of UTC", () => {
	const NOW = kolkata( "2026-09-24 01:00" )
	const ENTRIES = [
		"2026-09-24 00:00",
		"2026-09-23 23:59",
		"2026-09-23 00:00",
		"2026-09-22 23:59",
		"2026-09-21 00:00",
		"2026-09-20 23:59",
		"2026-09-14 00:00",
		"2026-09-13 23:59",
		"2026-09-01 00:00",
		"2026-08-31 23:59",
		"2026-08-01 00:00",
		"2026-07-31 23:59",
		"2026-01-01 00:00",
		"2025-12-31 23:59",
		"2025-01-01 00:00",
		"2024-12-31 23:59",
	]

	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: GADGET_UID,
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )

		await seed(
			cms,
			GADGET_UID,
			ENTRIES.map( ( title ) => ( {
				createdAt: kolkata( title ).toISOString(),
				title,
			} ) ),
		)
	} )

	afterAll( async () => {
		vi.useRealTimers()
		await cms?.destroy()
	} )

	beforeEach( async () => {
		vi.useFakeTimers( { now: NOW, toFake: [ "Date" ] } )
		// A login token carries the time it was issued, so the admin logs in
		// on the same clock the export reads.
		token = await cms.login( SUPER_ADMIN.email )
	} )

	afterEach( () => {
		vi.useRealTimers()
	} )

	it.each( [
		[ "today", "2026-09-24", "2026-09-24", [ "2026-09-24 00:00" ] ],
		[
			"yesterday",
			"2026-09-23",
			"2026-09-23",
			[ "2026-09-23 23:59", "2026-09-23 00:00" ],
		],
		[ "this_week", "2026-09-21", "2026-09-24", ENTRIES.slice( 0, 5 ) ],
		[
			"last_week",
			"2026-09-14",
			"2026-09-20",
			[ "2026-09-20 23:59", "2026-09-14 00:00" ],
		],
		[ "this_month", "2026-09-01", "2026-09-24", ENTRIES.slice( 0, 9 ) ],
		[
			"last_month",
			"2026-08-01",
			"2026-08-31",
			[ "2026-08-31 23:59", "2026-08-01 00:00" ],
		],
		[ "this_year", "2026-01-01", "2026-09-24", ENTRIES.slice( 0, 13 ) ],
		[
			"last_year",
			"2025-01-01",
			"2025-12-31",
			[ "2025-12-31 23:59", "2025-01-01 00:00" ],
		],
	] )( "exports %s, from %s to %s", async ( period, start, end, expected ) => {
		const { body } = await request_ticket( cms, token, {
			fields: [ "title" ],
			selection: { kind: "period", period },
			uid: GADGET_UID,
		} )
		const { bytes } = await download( cms, body.data.ticket )

		expect( body.data.file_name ).toBe( `gadgets_${start}_to_${end}.csv` )
		expect( titles_of( bytes.toString( "utf8" ) ) ).toEqual( expected )
	})

	it.each( [
		[ "a Monday", "2026-09-21 09:00", "2026-09-21", "2026-09-21" ],
		[ "a Sunday", "2026-09-27 23:30", "2026-09-21", "2026-09-27" ],
	] )( "starts this week on the Monday, when today is %s", async (
		_,
		now,
		start,
		end,
	) => {
		vi.setSystemTime( kolkata( now ) )
		token = await cms.login( SUPER_ADMIN.email )

		const { body } = await request_ticket( cms, token, {
			fields: [ "title" ],
			selection: { kind: "period", period: "this_week" },
			uid: GADGET_UID,
		} )

		expect( body.data.file_name ).toBe( `gadgets_${start}_to_${end}.csv` )
	})

	it("exports the days the modal showed, when the modal was opened the day before", async () => {
		// The modal was opened on 23 September, and Export is clicked after
		// midnight. "Today" still means the day the modal showed.
		const { body } = await request_ticket( cms, token, {
			fields: [ "title" ],
			selection: { as_of: "2026-09-23", kind: "period", period: "today" },
			uid: GADGET_UID,
		} )
		const { bytes } = await download( cms, body.data.ticket )

		expect( body.data.file_name ).toBe(
			"gadgets_2026-09-23_to_2026-09-23.csv",
		)
		expect( titles_of( bytes.toString( "utf8" ) ) ).toEqual( [
			"2026-09-23 23:59",
			"2026-09-23 00:00",
		] )
	})

	it.each( [ "2026-02-30", "yesterday", "2026-9-1" ] )(
		"refuses %j as the day a period is read from",
		async ( as_of ) => {
			const { status } = await request_ticket( cms, token, {
				fields: [ "title" ],
				selection: { as_of, kind: "period", period: "today" },
				uid: GADGET_UID,
			} )

			expect( status ).toBe( 400 )
		},
	)

	it("keeps the days fixed when the ticket was requested", async () => {
		const midnight = kolkata( "2026-09-25 00:00" ).getTime()

		vi.setSystemTime( midnight - 30_000 )
		// The login from 01:00 has expired by 23:59.
		token = await cms.login( SUPER_ADMIN.email )
		const { body } = await request_ticket( cms, token, {
			fields: [ "title" ],
			selection: { kind: "period", period: "today" },
			uid: GADGET_UID,
		} )

		vi.setSystemTime( midnight + 10_000 )
		const { bytes } = await download( cms, body.data.ticket )

		expect( titles_of( bytes.toString( "utf8" ) ) ).toEqual( [
			"2026-09-24 00:00",
		] )
	})
})

/**
 |
 | Each entry is named after the moment it was created, on the wall clock in
 | Kolkata, which runs 5½ hours ahead of UTC. The entries sit on either side of
 | the first moment of 21 September and the last moment of 23 September.
 |
 */
describe("Exporting a custom date range, in a timezone ahead of UTC", () => {
	const ENTRIES = [
		"2026-09-24 00:00",
		"2026-09-23 23:59",
		"2026-09-22 12:00",
		"2026-09-21 00:00",
		"2026-09-20 23:59",
	]

	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: GADGET_UID,
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )
		token = await cms.login( SUPER_ADMIN.email )

		await seed(
			cms,
			GADGET_UID,
			ENTRIES.map( ( title ) => ( {
				createdAt: kolkata( title ).toISOString(),
				title,
			} ) ),
		)
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	it("exports every entry created on or between both days, newest first", async () => {
		const { body } = await request_ticket(
			cms,
			token,
			range( "2026-09-21", "2026-09-23" ),
		)
		const { bytes } = await download( cms, body.data.ticket )

		expect( body.data.file_name ).toBe(
			"gadgets_2026-09-21_to_2026-09-23.csv",
		)
		expect( titles_of( bytes.toString( "utf8" ) ) ).toEqual( [
			"2026-09-23 23:59",
			"2026-09-22 12:00",
			"2026-09-21 00:00",
		] )
	})

	it("exports a single day when the start and end dates are the same", async () => {
		const { body } = await request_ticket(
			cms,
			token,
			range( "2026-09-23", "2026-09-23" ),
		)
		const { bytes } = await download( cms, body.data.ticket )

		expect( body.data.file_name ).toBe(
			"gadgets_2026-09-23_to_2026-09-23.csv",
		)
		expect( titles_of( bytes.toString( "utf8" ) ) ).toEqual( [
			"2026-09-23 23:59",
		] )
	})

	it("refuses an end date before the start date", async () => {
		const { status } = await request_ticket(
			cms,
			token,
			range( "2026-09-23", "2026-09-22" ),
		)

		expect( status ).toBe( 400 )
	})

	it.each( [
		[ "2026-02-30", "2026-03-01" ],
		[ "2026-9-1", "2026-09-02" ],
		[ "2026-09-01", undefined ],
		[ undefined, "2026-09-02" ],
	] )( "refuses %j to %j", async ( start, end ) => {
		const { status } = await request_ticket( cms, token, {
			fields: [ "title" ],
			selection: { end, kind: "range", start },
			uid: GADGET_UID,
		} )

		expect( status ).toBe( 400 )
	})
})

/**
 |
 | A running export is one whose download the test holds open. The export is
 | far larger than the buffers between the server and the test, so the server
 | cannot finish it while the test holds it.
 |
 */
describe("A running export", () => {
	const ROWS = 4000

	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: GADGET_UID,
				EXPORT_ENTRIES_PRESETS: String( ROWS ),
			},
		} )
		token = await cms.login( SUPER_ADMIN.email )

		await seed(
			cms,
			GADGET_UID,
			Array.from( { length: ROWS }, ( _, index ) => ( {
				createdAt: new Date(
					Date.UTC( 2026, 0, 1 ) + index * 60_000,
				).toISOString(),
				title: "x".repeat( 10_000 ),
			} ) ),
		)
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	it("answers \"An export is already running\" to the same admin", async () => {
		const held = await hold_download( cms, token, ROWS )

		try {
			const { body, status } = await request_ticket(
				cms,
				token,
				latest( ROWS ),
			)

			expect( status ).toBe( 200 )
			expect( body.data ).toEqual( { outcome: "export_running" } )
		} finally {
			held.disconnect()
		}
	})

	it("refuses a second download by the same admin, before any bytes", async () => {
		const { body } = await request_ticket( cms, token, latest( ROWS ) )
		const held = await hold_download( cms, token, ROWS )

		try {
			const { bytes, status } = await download( cms, body.data.ticket )

			expect( status ).toBe( 409 )
			expect( bytes.toString( "utf8" ) ).not.toContain( "xxx" )
		} finally {
			held.disconnect()
		}
	})

	it("lets another admin export meanwhile", async () => {
		const held = await hold_download( cms, token, ROWS )

		try {
			const role = await cms.create_role( "Gadget readers", [
				{ action: READ, conditions: [], subject: GADGET_UID },
			] )
			const email = await cms.create_admin( "other@example.com", role )
			const { body } = await request_ticket(
				cms,
				await cms.login( email ),
				latest( ROWS ),
			)

			expect( body.data.outcome ).toBe( "ticket" )
		} finally {
			held.disconnect()
		}
	})

	it("lets the admin export again once the browser disconnects", async () => {
		const held = await hold_download( cms, token, ROWS )
		held.disconnect()

		await expect_can_export_again( cms, token, ROWS )
	})

	it("cuts the download off when reading fails midway, so the browser marks it as failed", async () => {
		const held = await hold_download( cms, token, ROWS )
		const database = cms.strapi.db.connection

		// The batches still to come can no longer be read.
		await database.schema.renameTable( "gadgets", "gadgets_away" )

		try {
			await expect( read_to_end( held.reader ) ).rejects.toThrow()
		} finally {
			await database.schema.renameTable( "gadgets_away", "gadgets" )
		}

		await expect_can_export_again( cms, token, ROWS )
	}, 20_000 )

	it("runs a download that started in time to its end, however long it takes", async () => {
		const held = await hold_download( cms, token, ROWS )

		try {
			vi.useFakeTimers( { now: Date.now() + 10 * 60_000, toFake: [ "Date" ] } )

			await expect( read_to_end( held.reader ) ).resolves.toBeUndefined()
		} finally {
			vi.useRealTimers()
		}
	})

	it("lets the admin export again once the download ends", async () => {
		const held = await hold_download( cms, token, ROWS )
		await read_to_end( held.reader )

		await expect_can_export_again( cms, token, ROWS )
	})
})

describe("Reading in batches", () => {
	let cms: Fixture_Strapi
	let token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: GADGET_UID,
				EXPORT_ENTRIES_PRESETS: "1100",
			},
		} )
		token = await cms.login( SUPER_ADMIN.email )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	it("writes every row once, newest first, across several batches", async () => {
		// Ten entries share each creation time, so several batches end partway
		// through a run of equal times.
		const rows = Array.from( { length: 1234 }, ( _, index ) => ( {
			createdAt: new Date(
				Date.UTC( 2026, 0, 1 ) + Math.floor( index / 10 ) * 60_000,
			).toISOString(),
			title: String( index ).padStart( 4, "0" ),
		} ) )
		await seed( cms, GADGET_UID, rows )

		const csv = await export_csv( cms, token, latest( 1100 ) )

		// Within a run of equal times, the row inserted last has the higher ID
		// and so comes first.
		const expected = rows.map( ( row ) => row.title ).reverse()
			.slice( 0, 1100 )
		expect( titles_of( csv ) ).toEqual( expected )
	})
})

describe("Role limits", () => {
	let cms: Fixture_Strapi
	let super_token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: {
				article: ARTICLE,
				crate: CRATE,
				gadget: GADGET,
				maker: MAKER,
			},
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: `${GADGET_UID},${CRATE_UID}`,
				EXPORT_ENTRIES_PRESETS: "50",
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )
		super_token = await cms.login( SUPER_ADMIN.email )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	describe("for a role limited to some fields", () => {
		let token: string

		beforeAll( async () => {
			const role = await cms.create_role( "Gadget title readers", [ {
				action: READ,
				conditions: [],
				properties: { fields: [ "title" ] },
				subject: GADGET_UID,
			} ] )
			token = await cms.login(
				await cms.create_admin( "titles@example.com", role ),
			)
		} )

		it("refuses a request that names a hidden field", async () => {
			const { status } = await request_ticket( cms, token, {
				...latest( 50 ),
				fields: [ "title", "stock" ],
			} )

			expect( status ).toBe( 400 )
		})

		it("exports the fields it can read", async () => {
			await create_gadget(
				cms,
				"Titled",
				"2026-09-19T10:00:00Z",
				await admin_id_of( cms, SUPER_ADMIN.email ),
				3,
			)

			const csv = await export_csv( cms, token, latest( 50 ) )

			const rows = rows_of( csv )

			expect( rows[0] ).toEqual( [ "title", "Created at", "Updated at" ] )
			expect( rows.find( ( [ title ] ) => title === "Titled" ) ).toEqual( [
				"Titled",
				"2026-09-19 15:30",
				"2026-09-19 15:30",
			] )
		})
	})

	describe("for a role limited to the entries its admin created", () => {
		let email: string
		let token: string

		beforeAll( async () => {
			const role = await cms.create_role( "Own gadget readers", [ {
				action: READ,
				conditions: [ "admin::is-creator" ],
				subject: GADGET_UID,
			} ] )
			email = await cms.create_admin( "creator@example.com", role )
			token = await cms.login( email )

			const creator = await admin_id_of( cms, email )
			const other = await admin_id_of( cms, SUPER_ADMIN.email )
			await create_gadget( cms, "Mine, older", "2026-09-20T10:00:00Z", creator )
			await create_gadget( cms, "Theirs", "2026-09-21T10:00:00Z", other )
			await create_gadget( cms, "Mine, newer", "2026-09-22T10:00:00Z", creator )
		} )

		it("counts only those entries", async () => {
			const { body } = await request_ticket( cms, token, latest( 50 ) )

			expect( body.data.count ).toBe( 2 )
		})

		it("exports only those entries", async () => {
			const csv = await export_csv( cms, token, latest( 50 ) )

			expect( titles_of( csv ) ).toEqual( [ "Mine, newer", "Mine, older" ] )
		})

		it("exports only those entries within a date range", async () => {
			const csv = await export_csv(
				cms,
				token,
				range( "2026-09-20", "2026-09-21" ),
			)

			expect( titles_of( csv ) ).toEqual( [ "Mine, older" ] )
		})

		it("leaves Super Admin exporting every entry, whoever created it", async () => {
			const csv = await export_csv( cms, super_token, latest( 50 ) )

			expect( titles_of( csv ) ).toEqual(
				expect.arrayContaining( [ "Mine, newer", "Theirs", "Mine, older" ] ),
			)
		})
	})

	describe("for an admin whose roles grant a field only on their own entries", () => {
		it("leaves that field empty on the entries other admins created", async () => {
			const titles = await cms.create_role( "Every gadget's title", [ {
				action: READ,
				conditions: [],
				properties: { fields: [ "title" ] },
				subject: GADGET_UID,
			} ] )
			const own_stock = await cms.create_role( "Own gadgets' stock", [ {
				action: READ,
				conditions: [ "admin::is-creator" ],
				properties: { fields: [ "stock" ] },
				subject: GADGET_UID,
			} ] )
			const email = await cms.create_admin(
				"mixed@example.com",
				[ titles, own_stock ],
			)
			const creator = await admin_id_of( cms, email )
			const other = await admin_id_of( cms, SUPER_ADMIN.email )
			await create_gadget( cms, "Mixed, mine", "2026-09-24T10:00:00Z", creator, 7 )
			await create_gadget( cms, "Mixed, theirs", "2026-09-25T10:00:00Z", other, 9 )

			const csv = await export_csv( cms, await cms.login( email ), {
				...latest( 50 ),
				fields: [ "title", "stock" ],
			} )
			const rows = rows_of( csv ).filter( ( [ title ] ) =>
				title.startsWith( "Mixed" )
			)

			expect( rows.map( ( [ title, stock ] ) => [ title, stock ] ) ).toEqual( [
				[ "Mixed, theirs", "" ],
				[ "Mixed, mine", "7" ],
			] )
		})
	})

	describe("for a role that cannot read a related content-type", () => {
		let maker_document_id: string

		beforeAll( async () => {
			await configure_edit_view( cms, super_token, CRATE_UID, {
				labels: {},
				main_fields: { maker: "name" },
				order: [ "label", "maker" ],
				removed: [],
			} )
			const maker = await create_maker( cms, "M-1", "Acme" )
			await create_crate( cms, { label: "Boxed", maker } )
			const { documentId } = await cms.strapi.db.query( MAKER_UID )
				.findOne( { where: { id: maker } } )
			maker_document_id = documentId
		} )

		it("writes the related entry's document ID in place of its display field", async () => {
			const role = await cms.create_role( "Crate readers", [
				{ action: READ, conditions: [], subject: CRATE_UID },
			] )
			const email = await cms.create_admin( "crates@example.com", role )

			const csv = await export_csv(
				cms,
				await cms.login( email ),
				crates( [ "label", "maker" ] ),
			)

			const boxed = rows_of( csv ).find( ( [ label ] ) => label === "Boxed" )

			expect( boxed?.slice( 0, 2 ) ).toEqual( [ "Boxed", maker_document_id ] )
		})

		it("writes the document ID of a related entry the role cannot read", async () => {
			const role = await cms.create_role( "Crate and own maker readers", [
				{ action: READ, conditions: [], subject: CRATE_UID },
				{
					action: READ,
					conditions: [ "admin::is-creator" ],
					subject: MAKER_UID,
				},
			] )
			const email = await cms.create_admin( "own-makers@example.com", role )
			const own = await cms.strapi.db.query( MAKER_UID ).create( {
				data: {
					code: "M-2",
					createdBy: await admin_id_of( cms, email ),
					documentId: crypto.randomUUID().replace( /-/g, "" ),
					name: "Own maker",
				},
			} )
			await create_crate( cms, { label: "Own maker's", maker: own.id } )

			const csv = await export_csv(
				cms,
				await cms.login( email ),
				crates( [ "label", "maker" ] ),
			)
			const cells = rows_of( csv ).slice( 1 ).map( ( [ label, made_by ] ) =>
				[ label, made_by ]
			)

			expect( cells ).toEqual( [
				[ "Own maker's", "Own maker" ],
				[ "Boxed", maker_document_id ],
			] )
		})

		it("writes the display field for Super Admin", async () => {
			const csv = await export_csv(
				cms,
				super_token,
				crates( [ "label", "maker" ] ),
			)

			const boxed = rows_of( csv ).find( ( [ label ] ) => label === "Boxed" )

			expect( boxed?.slice( 0, 2 ) ).toEqual( [ "Boxed", "Acme" ] )
		})
	})

	describe("for a role narrowed after the ticket was issued", () => {
		it("exports only the entries the current role can read", async () => {
			const role = await cms.create_role( "Narrowed to own gadgets", [
				{ action: READ, conditions: [], subject: GADGET_UID },
			] )
			const email = await cms.create_admin( "narrowed@example.com", role )
			await create_gadget(
				cms,
				"Narrowed admin's own",
				"2026-09-23T10:00:00Z",
				await admin_id_of( cms, email ),
			)
			const { body } = await request_ticket(
				cms,
				await cms.login( email ),
				latest( 50 ),
			)

			await cms.strapi.service( "admin::role" ).assignPermissions( role, [ {
				action: READ,
				conditions: [ "admin::is-creator" ],
				subject: GADGET_UID,
			} ] )
			const { bytes } = await download( cms, body.data.ticket )

			expect( titles_of( bytes.toString( "utf8" ) ) ).toEqual( [
				"Narrowed admin's own",
			] )
		})

		it("refuses the ticket when a chosen field has been hidden", async () => {
			const role = await cms.create_role( "Losing stock", [ {
				action: READ,
				conditions: [],
				properties: { fields: [ "title", "stock" ] },
				subject: GADGET_UID,
			} ] )
			const email = await cms.create_admin( "losing@example.com", role )
			const { body } = await request_ticket( cms, await cms.login( email ), {
				...latest( 50 ),
				fields: [ "title", "stock" ],
			} )

			await cms.strapi.service( "admin::role" ).assignPermissions( role, [ {
				action: READ,
				conditions: [],
				properties: { fields: [ "title" ] },
				subject: GADGET_UID,
			} ] )
			const { bytes, status } = await download( cms, body.data.ticket )

			expect( status ).toBe( 403 )
			expect( bytes.toString( "utf8" ) ).not.toContain( "\uFEFF" )
		})
	})
})

type Ticket_Request = {
	uid: string
	selection: Record<string, unknown>
	fields: string[]
}

/**
 |
 | Writes rows straight into the database, so that each row's creation time is
 | whatever the test needs. `updatedAt` follows `createdAt` unless it is given.
 |
 */
async function seed (
	cms: Fixture_Strapi,
	uid: string,
	rows: Record<string, unknown>[],
) {
	await cms.strapi.db.query( uid ).createMany( {
		data: rows.map( ( row ) => ( {
			...row,
			createdAt: new Date( row.createdAt as string ),
			documentId: crypto.randomUUID().replace( /-/g, "" ),
			updatedAt: new Date( ( row.updatedAt ?? row.createdAt ) as string ),
		} ) ),
	} )
}

async function admin_id_of ( cms: Fixture_Strapi, email: string ) {
	const admin = await cms.strapi.db.query( "admin::user" )
		.findOne( { where: { email } } )

	return admin.id as number
}

/** Writes one gadget straight into the database, as created by an admin. */
async function create_gadget (
	cms: Fixture_Strapi,
	title: string,
	created_at: string,
	created_by: number,
	stock?: number,
) {
	await cms.strapi.db.query( GADGET_UID ).create( {
		data: {
			createdAt: new Date( created_at ),
			createdBy: created_by,
			documentId: crypto.randomUUID().replace( /-/g, "" ),
			stock,
			title,
			updatedAt: new Date( created_at ),
		},
	} )
}

/** A request for the latest `count` gadgets, with only the title. */
function latest ( count: number ): Ticket_Request {
	return {
		fields: [ "title" ],
		selection: { count, kind: "latest" },
		uid: GADGET_UID,
	}
}

/** A request for the latest 50 crates, with the given fields. */
function crates ( fields: string[] ): Ticket_Request {
	return {
		fields,
		selection: { count: 50, kind: "latest" },
		uid: CRATE_UID,
	}
}

async function create_maker ( cms: Fixture_Strapi, code: string, name: string ) {
	const maker = await cms.strapi.db.query( MAKER_UID ).create( {
		data: { code, documentId: crypto.randomUUID().replace( /-/g, "" ), name },
	} )

	return maker.id as number
}

/** Records an uploaded file, as the media library would, at `url`. */
async function create_file ( cms: Fixture_Strapi, url: string ) {
	const name = url.split( "/" ).pop()
	const file = await cms.strapi.db.query( "plugin::upload.file" ).create( {
		data: {
			documentId: crypto.randomUUID().replace( /-/g, "" ),
			ext: `.${name.split( "." ).pop()}`,
			hash: crypto.randomUUID(),
			mime: "image/png",
			name,
			provider: "local",
			size: 1,
			url,
		},
	} )

	return file.id as number
}

/**
 |
 | Writes one crate straight into the database, linked to the given makers and
 | files by their IDs. A crate created later sorts first in an export.
 |
 */
async function create_crate (
	cms: Fixture_Strapi,
	data: Record<string, unknown>,
) {
	await cms.strapi.db.query( CRATE_UID ).create( {
		data: {
			documentId: crypto.randomUUID().replace( /-/g, "" ),
			...data,
		},
	} )
}

/** A request for the gadgets created from `start` to `end`, with the title. */
function range ( start: string, end: string ): Ticket_Request {
	return {
		fields: [ "title" ],
		selection: { end, kind: "range", start },
		uid: GADGET_UID,
	}
}

/** The instant a `YYYY-MM-DD HH:mm` wall-clock time in Kolkata names. */
function kolkata ( wall_clock: string ): Date {
	return new Date( `${wall_clock.replace( " ", "T" )}:00+05:30` )
}

function today_in_kolkata () {
	return new Date( Date.now() + 5.5 * 60 * 60 * 1000 ).toISOString()
		.slice( 0, 10 )
}

/** The first column of every row but the heading row. */
function titles_of ( csv: string ) {
	return rows_of( csv ).slice( 1 ).map( ( [ title ] ) => title )
}

async function request_ticket (
	cms: Fixture_Strapi,
	token: string,
	body: Ticket_Request,
) {
	return cms.request( "POST", "/export-entries/tickets", { body, token } )
}

async function download ( cms: Fixture_Strapi, ticket: string ) {
	const response = await fetch(
		`${cms.url}/export-entries/download?ticket=${
			encodeURIComponent( ticket )
		}`,
	)
	const bytes = Buffer.from( await response.arrayBuffer() )

	return { bytes, headers: response.headers, status: response.status }
}

/**
 |
 | Starts the download of the latest entries, and waits for its first bytes
 | without reading any further.
 |
 */
async function hold_download (
	cms: Fixture_Strapi,
	token: string,
	count: number,
) {
	const { body } = await request_ticket( cms, token, latest( count ) )
	const connection = new AbortController()
	const response = await fetch(
		`${cms.url}/export-entries/download?ticket=${
			encodeURIComponent( body.data.ticket )
		}`,
		{ signal: connection.signal },
	)
	const reader = response.body!.getReader()
	await reader.read()

	return {
		disconnect: () => connection.abort(),
		reader,
	}
}

/** Waits until the admin's running export has cleared. */
async function expect_can_export_again (
	cms: Fixture_Strapi,
	token: string,
	count: number,
) {
	await vi.waitFor( async () => {
		const { body } = await request_ticket( cms, token, latest( count ) )

		expect( body.data.outcome ).toBe( "ticket" )
	} )
}

async function read_to_end ( reader: ReadableStreamDefaultReader ) {
	while ( !( await reader.read() ).done ) {
		// Reads the rest of the file.
	}
}

/** Requests a ticket, downloads with it, and answers the file's text. */
async function export_csv (
	cms: Fixture_Strapi,
	token: string,
	body: Ticket_Request,
) {
	const { body: answer, status } = await request_ticket( cms, token, body )

	if ( status !== 200 || !answer.data.ticket ) {
		throw new Error(
			`Request ticket answered ${status}: ${JSON.stringify( answer )}`,
		)
	}

	const file = await download( cms, answer.data.ticket )

	return file.bytes.toString( "utf8" )
}

/**
 |
 | Splits a CSV into rows of cells. It understands only the plugin's own
 | output — a BOM, CRLF line ends, and every cell quoted — and throws on
 | anything else, so a lapse in the format fails the test that reads it.
 |
 */
function rows_of ( csv: string ): string[][] {
	if ( !csv.startsWith( "\uFEFF" ) ) {
		throw new Error( "The CSV does not start with a byte-order mark." )
	}

	const rows: string[][] = []
	let row: string[] = []
	let at = 1

	while ( at < csv.length ) {
		if ( csv[at] !== "\"" ) {
			throw new Error( `An unquoted cell starts at ${at}.` )
		}

		let cell = ""
		at += 1

		while ( true ) {
			const next = csv.indexOf( "\"", at )

			if ( next === -1 ) {
				throw new Error( "A cell is never closed." )
			}

			cell += csv.slice( at, next )
			at = next + 1

			if ( csv[at] === "\"" ) {
				cell += "\""
				at += 1
			} else {
				break
			}
		}

		row.push( cell )

		if ( csv[at] === "," ) {
			at += 1
		} else if ( csv.startsWith( "\r\n", at ) ) {
			rows.push( row )
			row = []
			at += 2
		} else {
			throw new Error( `A cell is not followed by "," or CRLF at ${at}.` )
		}
	}

	return rows
}
