
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
import { GADGET, WIDGET } from "./support/schemas.ts"

const GADGET_UID = "api::gadget.gadget"

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

	it("keeps the days fixed when the ticket was requested", async () => {
		const { body } = await request_ticket( cms, token, {
			fields: [ "title" ],
			selection: { kind: "period", period: "today" },
			uid: GADGET_UID,
		} )

		vi.setSystemTime( kolkata( "2026-09-25 00:00" ) )
		const { bytes } = await download( cms, body.data.ticket )

		expect( titles_of( bytes.toString( "utf8" ) ) ).toEqual( [
			"2026-09-24 00:00",
		] )
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

/** A request for the latest `count` gadgets, with only the title. */
function latest ( count: number ): Ticket_Request {
	return {
		fields: [ "title" ],
		selection: { count, kind: "latest" },
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
