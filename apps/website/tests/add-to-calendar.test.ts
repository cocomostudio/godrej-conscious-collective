
/**
 |
 | Add to Calendar, end to end: the control a visitor is served, and the file
 | the address behind it answers with.
 |
 | The endpoint is driven **entirely by its query string** — it reads no entry
 | and asks the CMS nothing — so the two halves are one seam rather than two.
 | What the page renders is the input to what the endpoint returns, and a test
 | that minted its own links would be testing the endpoint against an address
 | no page ever produces.
 |
 | Which is why nothing below writes a URL by hand. Every request starts from
 | an `href` lifted out of a rendered page, exactly as a visitor's tap does.
 |
 | ─── ON THE SIGNATURE ───────────────────────────────────────────────────────
 |
 | The endpoint honours only the links it minted itself. That is the whole of
 | its defence: without it, the address is a public machine for putting
 | arbitrary words into somebody's calendar under this site's own domain. The
 | tampering cases are therefore the point of this file rather than an edge of
 | it, and they cover each parameter separately — a signature that covered the
 | title but not the time would pass a test that only ever edited the title.
 |
 | ─── WHAT THIS SEAM CANNOT REACH ────────────────────────────────────────────
 |
 | **Which** instance is offered, and whether the control is shown at all, are
 | decided in the browser against the real clock — see `calendar-entry.test.ts`
 | for that half. A server-rendered page cannot make either decision, because
 | page responses are cached and a decision made against the clock while
 | rendering is a decision frozen for every visitor served that cache entry.
 | What the server serves is the earliest instance, unconditionally, and that is
 | what is asserted here.
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
	instance,
	section,
	session_envelope,
	session_schedule_list,
	session_schedule_row,
} from "./support/envelopes.ts"

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		"/sessions/living-with-the-land": session_envelope( {
			category: "Showcase",
			instances: [
				instance( "2025-12-11", "10:00", "12:30" ),
				instance( "2025-12-12", "14:00", "16:30" ),
			],
			name: "Living with the Land",
			session_date_first: "2025-12-11",
			session_date_last: "2025-12-12",
			standfirst: "A two-part showcase.",
			venue: venue_link( "Outdoor Pergola" ),
		} ),

		// A name carrying every character RFC 5545 treats as structure, so
		// that the escaping is exercised through the whole path rather than in
		// the document builder alone.
		"/sessions/punctuated": session_envelope( {
			instances: [ instance( "2025-12-11", "10:00", "12:30" ) ],
			name: "Tea, cake; and a back\\slash",
			venue: null,
		} ),

		"/sessions/no-venue": session_envelope( {
			instances: [ instance( "2025-12-11", "10:00", "12:30" ) ],
			name: "No Venue",
			standfirst: null,
			venue: null,
		} ),

		// A standfirst past the 300-character cap, so that the clipping — and
		// what the signature covers once clipping has happened — is exercised.
		"/sessions/long-winded": session_envelope( {
			instances: [ instance( "2025-12-11", "10:00", "12:30" ) ],
			name: "Long Winded",
			standfirst: "A ".repeat( 400 ),
			venue: null,
		} ),

		// An all-day session **keeps its stored hours**: the page reads "All
		// day" because a start time that means nothing misleads a visitor, but
		// a calendar has to place the entry somewhere.
		"/sessions/all-day": session_envelope( {
			all_day_event: true,
			instances: [ instance( "2025-12-11", "09:00", "22:00" ) ],
			name: "All Day",
			venue: null,
		} ),

		"/sessions/undated": session_envelope( {
			instances: [],
			name: "Undated",
			session_date_first: null,
			session_date_last: null,
		} ),

		"/schedule": envelope( {
			main_region: [
				section( "The programme", {
					content: [ session_schedule_list( [
						session_schedule_row( {
							instances: [
								instance(
									"2025-12-11",
									"10:00",
									"12:30",
								),
								instance(
									"2025-12-12",
									"14:00",
									"16:30",
								),
							],
							name: "Living with the Land",
							path: "/sessions/living-with-the-land",
						} ),
					] ) ],
				} ),
			],
			title: "Schedule",
		} ),

		/**
		 |
		 | A session whose alias reads as an address elsewhere. Webtools lets an
		 | author override any generated URL, so this is a shape the CMS can
		 | genuinely hand over — and the endpoint signs whatever it is given, so
		 | the guard has to hold on the way back out rather than on the way in.
		 |
		 */
		"/hostile": envelope( {
			main_region: [ section( "The programme", {
				content: [ session_schedule_list( [
					session_schedule_row( {
						instances: [
							instance( "2025-12-11", "10:00", "12:30" ),
						],
						name: "Hostile Alias",
						path: "/\\evil.test/x",
					} ),
				] ) ],
			} ) ],
			title: "Hostile",
		} ),

		"/about": envelope( {
			main_region: [ section( "About" ) ],
			title: "About",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("the control a session's page serves", () => {
	it("is a link to the endpoint rather than a button that does nothing", async () => {
		const links = await calendar_links_on(
			"/sessions/living-with-the-land",
		)

		expect( links.length ).toBeGreaterThan( 0 )

		for ( const link of links ) {
			expect( link ).toMatch( /^\/calendar\.ics\?/ )
		}
	})

	/**
	 |
	 | The sidebar renders twice — once down the side and once inside the main
	 | column for a phone — and both copies point at the same instance. The
	 | design has both; a second address for one of them would be two answers
	 | to one question.
	 |
	 */
	it("points both copies of the sidebar at the same instance", async () => {
		const links = await calendar_links_on(
			"/sessions/living-with-the-land",
		)

		expect( links.length ).toBe( 2 )
		expect( links[0] ).toBe( links[1] )
	})

	it("carries the session's own facts in the address", async () => {
		const [ link ] = await calendar_links_on(
			"/sessions/living-with-the-land",
		)
		const parameters = new URL( link, website.url ).searchParams

		expect( parameters.get( "title" ) ).toBe( "Living with the Land" )
		expect( parameters.get( "at" ) ).toBe( "Outdoor Pergola" )
		expect( parameters.get( "note" ) ).toBe( "A two-part showcase." )
		expect( parameters.get( "path" ) )
			.toBe( "/sessions/living-with-the-land" )
		expect( Date.parse( parameters.get( "start" ) ?? "" ) )
			.toBe( Date.parse( "2025-12-11T10:00:00.000+05:30" ) )
		expect( Date.parse( parameters.get( "end" ) ?? "" ) )
			.toBe( Date.parse( "2025-12-11T12:30:00.000+05:30" ) )
		expect( parameters.get( "sig" ) ).toBeTruthy()
	})

	/**
	 |
	 | The earliest instance, and not the first one the CMS happened to list.
	 | Nothing here consults the clock — see the note at the top of the file.
	 |
	 */
	it("serves the earliest instance", async () => {
		const [ link ] = await calendar_links_on(
			"/sessions/living-with-the-land",
		)

		expect( new URL( link, website.url ).searchParams.get( "start" ) )
			.toContain( "2025-12-11" )
	})

	it("is not served at all for a session with no instances", async () => {
		expect( await calendar_links_on( "/sessions/undated" ) ).toEqual( [] )
	})

	it("is not served on a page that is not a session", async () => {
		expect( await calendar_links_on( "/about" ) ).toEqual( [] )
	})
})

/**
 |
 | The schedule lists one entry per instance, so each entry's control offers
 | **its own** instance rather than the session's earliest. A schedule entry is
 | one instance; that is the whole reason the schedule holds more entries than
 | the CMS sent sessions.
 |
 */
describe("the control a schedule row serves", () => {
	// **Two controls per entry, not one.** A glyph at the foot of the words on
	// a phone and a labelled button under the hours from the medium breakpoint
	// up; each is drawn only at its own width, and both offer the same
	// instance. So two entries are four links over two distinct starts, and
	// the distinct ones in the order the entries are in are what this is
	// about.
	it("gives each row the instance that row is about", async () => {
		const links = await calendar_links_on( "/schedule" )
		const starts = links.map( ( link ) =>
			new URL( link, website.url ).searchParams.get( "start" )
		)

		const [ first, second, ...rest ] = [ ...new Set( starts ) ]

		expect( links.length ).toBe( 4 )
		expect( rest ).toEqual( [] )
		expect( first ).toContain( "2025-12-11" )
		expect( second ).toContain( "2025-12-12" )
	})
})

describe("the file the endpoint answers with", () => {
	it("is a calendar, and says so in every header that matters", async () => {
		const [ link ] = await calendar_links_on(
			"/sessions/living-with-the-land",
		)
		const { headers, status } = await website.get( link )

		expect( status ).toBe( 200 )
		expect( headers.get( "content-type" ) )
			.toContain( "text/calendar" )

		/**
		 |
		 | Both of these are load-bearing rather than decoration. The body is
		 | text this endpoint was handed in a query string, and a browser that
		 | sniffed it as HTML instead of believing the content type would be
		 | running that text as a document on this site's own origin.
		 | `nosniff` closes that, and the disposition keeps it a file.
		 |
		 */
		expect( headers.get( "x-content-type-options" ) ).toBe( "nosniff" )
		expect( headers.get( "content-disposition" ) )
			.toContain( "attachment" )
	})

	it("holds the instance the link was for", async () => {
		const [ link ] = await calendar_links_on(
			"/sessions/living-with-the-land",
		)
		const ics = unfolded( ( await website.get( link ) ).html )

		expect( ics ).toContain( "BEGIN:VEVENT" )
		expect( ics ).toContain( "SUMMARY:Living with the Land" )
		expect( ics ).toContain( "LOCATION:Outdoor Pergola" )
		expect( ics ).toContain( "DTSTART:20251211T043000Z" )
		expect( ics ).toContain( "DTEND:20251211T070000Z" )
	})

	/**
	 |
	 | The link back is built from the `path` parameter against this server's
	 | own origin, never taken as a whole address. A parameter that became a
	 | link verbatim would let anyone mint a calendar entry on this domain
	 | carrying a link to somewhere else entirely.
	 |
	 */
	it("links back to the session on this site's own origin", async () => {
		const [ link ] = await calendar_links_on(
			"/sessions/living-with-the-land",
		)
		const ics = unfolded( ( await website.get( link ) ).html )

		expect( ics ).toContain(
			`URL:${website.url}/sessions/living-with-the-land`,
		)
	})

	it("escapes a name that would otherwise be structure", async () => {
		const [ link ] = await calendar_links_on( "/sessions/punctuated" )
		const ics = unfolded( ( await website.get( link ) ).html )

		expect( ics )
			.toContain( "SUMMARY:Tea\\, cake\\; and a back\\\\slash" )
		expect( occurrences( ics, "BEGIN:VEVENT" ) ).toBe( 1 )
	})

	it("leaves out what the session does not have", async () => {
		const [ link ] = await calendar_links_on( "/sessions/no-venue" )
		const ics = unfolded( ( await website.get( link ) ).html )

		expect( ics ).toContain( "SUMMARY:No Venue" )
		expect( ics ).not.toContain( "LOCATION:" )
	})

	/**
	 |
	 | An all-day session keeps its stored hours rather than becoming a
	 | `VALUE=DATE` entry. The website reads "All day" and the calendar reads
	 | 9am — the stored shape does not change for one, which is the whole
	 | reason both ends are datetimes even here.
	 |
	 */
	it("places an all-day session at the hours it stored", async () => {
		const [ link ] = await calendar_links_on( "/sessions/all-day" )
		const ics = unfolded( ( await website.get( link ) ).html )

		expect( ics ).toContain( "DTSTART:20251211T033000Z" )
		expect( ics ).toContain( "DTEND:20251211T163000Z" )
		expect( ics ).not.toContain( "VALUE=DATE" )
	})

	it("asks the CMS nothing", async () => {
		const [ link ] = await calendar_links_on(
			"/sessions/living-with-the-land",
		)

		const before = website.cms.requests.length
		await website.get( link )

		expect( website.cms.requests.length ).toBe( before )
	})
})

/**
 |
 | The signature is the endpoint's only defence, so each parameter is edited on
 | its own. One that covered the title but not the times would sail through a
 | test that only ever edited the title.
 |
 */
describe("an address this server did not mint", () => {
	it("is refused outright when it carries no signature", async () => {
		const link = await a_calendar_link()
		const forged = without( link, "sig" )

		expect( ( await website.get( forged ) ).status ).toBe( 404 )
	})

	it("is refused when the signature is somebody else's", async () => {
		const link = await a_calendar_link()
		const forged = edited( link, "sig", "0".repeat( 64 ) )

		expect( ( await website.get( forged ) ).status ).toBe( 404 )
	})

	for (
		const [ parameter, value ] of [
			[ "title", "Free Money" ],
			[ "start", "2030-01-01T10:00:00.000+05:30" ],
			[ "end", "2030-01-01T12:00:00.000+05:30" ],
			[ "at", "Somewhere Else" ],
			[ "note", "Bring your bank details" ],
			[ "path", "/sessions/something-else" ],
		]
	) {
		it(`is refused when \`${parameter}\` has been edited`, async () => {
			const link = await a_calendar_link()
			const forged = edited( link, parameter, value )

			expect( ( await website.get( forged ) ).status ).toBe( 404 )
		})
	}

	it("is refused when a parameter has been dropped", async () => {
		const link = await a_calendar_link()
		const forged = without( link, "at" )

		expect( ( await website.get( forged ) ).status ).toBe( 404 )
	})

	/**
	 |
	 | The signature covers a canonical form built from the parameters the
	 | endpoint reads, so a parameter it does not read cannot change what it
	 | answers — and cannot break a link somebody pasted through something that
	 | appends its own tracking.
	 |
	 */
	/**
	 |
	 | **The hole this closes.** Values are clipped to a cap before they are
	 | signed, so for a parameter minted at that cap an attacker could append
	 | any amount of text: the canonical form clipped the addition away, the
	 | signature verified against the shorter string, and the raw value was
	 | what got written into the file. The signature was covering something
	 | other than what the entry said.
	 |
	 | The endpoint now reads its values back out of the canonical form, so
	 | what it writes is definitionally what it verified.
	 |
	 */
	it("does not carry text appended past the length cap", async () => {
		const [ link ] = await calendar_links_on( "/sessions/long-winded" )
		const url = new URL( link, website.url )

		url.searchParams.set(
			"note",
			`${url.searchParams.get( "note" )}INJECTED`,
		)

		const { html, status } = await website.get(
			`${url.pathname}${url.search}`,
		)

		// Not a refusal — the appended text simply is not part of what was
		// signed, exactly as an unknown parameter is not.
		expect( status ).toBe( 200 )
		expect( html ).not.toContain( "INJECTED" )
	})

	/**
	 |
	 | The `path` parameter is signed, so this is defence in depth rather than
	 | a hole — but it is the one parameter that becomes a **link** inside the
	 | finished entry, and `/\evil.test` resolves off-origin exactly as
	 | `//evil.test` does. The URL standard treats a backslash as a separator
	 | for http and https, so a guard that checks only for the slash catches
	 | the shape everybody knows and misses its twin.
	 |
	 */
	it("never lets a path resolve to another origin", async () => {
		const [ link ] = await calendar_links_on( "/hostile" )
		const ics = unfolded( ( await website.get( link ) ).html )

		expect( ics ).toContain( "SUMMARY:Hostile Alias" )
		expect( ics ).not.toContain( "evil.test" )
		expect( ics ).not.toContain( "URL:" )
	})

	it("is honoured when something has appended a parameter of its own", async () => {
		const link = await a_calendar_link()

		expect( ( await website.get( `${link}&utm_source=whatsapp` ) ).status )
			.toBe( 200 )
	})

	it("is honoured when the parameters arrive in another order", async () => {
		const link = await a_calendar_link()
		const url = new URL( link, website.url )
		const reversed = new URLSearchParams(
			[ ...url.searchParams ].reverse(),
		)

		expect(
			( await website.get( `/calendar.ics?${reversed}` ) ).status,
		).toBe( 200 )
	})
})

/* _____
 | Reading the page as a visitor's browser would.
 |
 */

async function calendar_links_on ( path: string ): Promise<string[]> {
	const { html } = await website.get( path )
	const body = html.replace( /<script[\s\S]*?<\/script>/g, "" )

	return [ ...body.matchAll( /href="(\/calendar\.ics\?[^"]*)"/g ) ]
		// An attribute in HTML carries its ampersands escaped, and a browser
		// unescapes them before it follows the link. So does this.
		.map( ( match ) => match[1].replaceAll( "&amp;", "&" ) )
}

async function a_calendar_link () {
	const [ link ] = await calendar_links_on( "/sessions/living-with-the-land" )

	return link
}

function edited ( link: string, parameter: string, value: string ) {
	const url = new URL( link, "http://edit.test" )
	url.searchParams.set( parameter, value )

	return `${url.pathname}${url.search}`
}

function without ( link: string, parameter: string ) {
	const url = new URL( link, "http://edit.test" )
	url.searchParams.delete( parameter )

	return `${url.pathname}${url.search}`
}

/**
 |
 | A venue: the link component as an ordinary attribute rather than as an entry
 | in a dynamic zone, so it carries no `__component`.
 |
 */
function venue_link ( label: string ) {
	return {
		label,
		style: "plain" as const,
		url: "https://example.com/maps/pergola",
	}
}

function unfolded ( ics: string ) {
	return ics.replace( /\r\n[ \t]/g, "" )
}

function occurrences ( haystack: string, needle: string ) {
	return haystack.split( needle ).length - 1
}
