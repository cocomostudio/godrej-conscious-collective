
/**
 |
 | The calendar entry itself: the iCalendar document, and which instance a
 | control offers.
 |
 | A pure seam rather than an HTTP one, because neither half has any I/O in it
 | — and because the two things worth being exact about here, RFC 5545's
 | escaping and its line folding, are invisible from outside the response. A
 | test that only read the document over HTTP would be asserting that the words
 | are present, which is the half that never breaks.
 |
 | `unfolded` is the inverse of the folding under test, and every assertion
 | about content runs through it. Folding is a transport rule — a reader
 | unfolds before it reads a value — so asserting on the folded form would be
 | asserting on where the line breaks fell rather than on what the entry says.
 |
 */

import {
	describe,
	expect,
	it,
} from "vitest"

import {
	calendar_uid,
	ics_document,
} from "../src/web/cms/calendar-entry.ts"
import {
	is_over,
	upcoming_link,
} from "../src/web/cms/calendar-links.ts"

const STAMPED_AT = new Date( "2026-08-26T09:15:00.000Z" )

function document_for (
	over: Partial<Parameters<typeof ics_document>[0]> = {},
) {
	return ics_document( {
		description: null,
		end: "2025-12-11T12:30:00.000+05:30",
		location: null,
		stamped_at: STAMPED_AT,
		start: "2025-12-11T10:00:00.000+05:30",
		summary: "Living with the Land",
		uid: "sessions-living-with-the-land-20251211T043000Z@example.test",
		url: null,
		...over,
	} )
}

function unfolded ( ics: string ) {
	return ics.replace( /\r\n[ \t]/g, "" )
}

/**
 |
 | CRLF terminates a content line rather than separating it from the next, so
 | the split leaves an empty tail behind the final terminator. It is dropped
 | here rather than asserted around, because it is not a line.
 |
 */
function lines_of ( ics: string ) {
	const lines = ics.split( "\r\n" )

	return lines.at( -1 ) === "" ? lines.slice( 0, -1 ) : lines
}

describe("the iCalendar document", () => {
	it("is a single VEVENT inside a VCALENDAR", () => {
		const lines = lines_of( document_for() )

		expect( lines[0] ).toBe( "BEGIN:VCALENDAR" )
		expect( lines.at( -1 ) ).toBe( "END:VCALENDAR" )
		expect( lines ).toContain( "VERSION:2.0" )
		expect( lines ).toContain( "BEGIN:VEVENT" )
		expect( lines ).toContain( "END:VEVENT" )
	})

	/**
	 |
	 | Every line ends CRLF, including the last one. RFC 5545 defines the
	 | content lines as CRLF-terminated rather than CRLF-separated, and a
	 | calendar that reads the file line by line is entitled to expect the
	 | terminator on the one that closes it.
	 |
	 */
	it("ends every line with CRLF, the last one included", () => {
		const ics = document_for()

		expect( ics.endsWith( "END:VCALENDAR\r\n" ) ).toBe( true )
		expect( ics ).not.toMatch( /[^\r]\n/ )
	})

	/**
	 |
	 | The stored instance carries the event's own offset. A calendar reading
	 | `+05:30` would have to be told what that zone is called to place the
	 | entry, so both ends are written as UTC instants instead — the one form
	 | that needs no VTIMEZONE block and cannot be misread.
	 |
	 */
	it("writes both ends as UTC instants", () => {
		const lines = lines_of( document_for() )

		expect( lines ).toContain( "DTSTART:20251211T043000Z" )
		expect( lines ).toContain( "DTEND:20251211T070000Z" )
	})

	it("leaves DTEND out when the instance has no end", () => {
		const ics = document_for( { end: null } )

		expect( ics ).toContain( "DTSTART:" )
		expect( ics ).not.toContain( "DTEND:" )
	})

	it("stamps itself with the moment it was written", () => {
		expect( lines_of( document_for() ) )
			.toContain( "DTSTAMP:20260826T091500Z" )
	})

	it("carries the summary, and drops the properties that have no value", () => {
		const ics = unfolded( document_for() )

		expect( ics ).toContain( "SUMMARY:Living with the Land" )
		expect( ics ).not.toContain( "LOCATION:" )
		expect( ics ).not.toContain( "DESCRIPTION:" )
		expect( ics ).not.toContain( "URL:" )
	})

	it("carries the location, the description and the url when it has them", () => {
		const ics = unfolded( document_for( {
			description: "A two-part showcase.",
			location: "Outdoor Pergola",
			url: "https://example.test/sessions/living-with-the-land",
		} ) )

		expect( ics ).toContain( "LOCATION:Outdoor Pergola" )
		expect( ics ).toContain( "DESCRIPTION:A two-part showcase." )
		expect( ics ).toContain(
			"URL:https://example.test/sessions/living-with-the-land",
		)
	})
})

/**
 |
 | Escaping is what keeps a value a value.
 |
 | Every one of these characters means something structural in RFC 5545 — a
 | comma and a semicolon separate values and parameters, a backslash starts an
 | escape, and a newline ends the property. Left alone in a session's name, an
 | editor typing one would end the property early and everything after it would
 | be read as a fresh line: a second VEVENT is minted by typing one.
 |
 | The endpoint takes its text from the query string, so this is not a
 | hypothetical about editor input — it is the boundary that keeps a crafted
 | link from becoming a crafted calendar.
 |
 */
describe("escaping", () => {
	it("escapes the characters that would otherwise be structure", () => {
		const ics = unfolded( document_for( {
			summary: "Tea, cake; and a back\\slash",
		} ) )

		expect( ics ).toContain(
			"SUMMARY:Tea\\, cake\\; and a back\\\\slash",
		)
	})

	it("turns a newline into its escape rather than a new line", () => {
		const ics = document_for( {
			description: "One\nTwo\r\nThree",
			summary: "A Session",
		} )

		expect( unfolded( ics ) )
			.toContain( "DESCRIPTION:One\\nTwo\\nThree" )
		expect( lines_of( ics ) ).not.toContain( "Two" )
	})

	/**
	 |
	 | The one property that is not escaped, because it is not TEXT. A URI
	 | value takes its characters literally, and a comma escaped inside one
	 | would be a comma in the address a calendar opens.
	 |
	 */
	it("leaves a URI value alone", () => {
		const ics = unfolded( document_for( {
			url: "https://example.test/a,b;c",
		} ) )

		expect( ics ).toContain( "URL:https://example.test/a,b;c" )
	})

	/**
	 |
	 | Asserted on whole lines rather than on the text of the document, because
	 | the injected words are still *in* the file — inside the summary's value,
	 | where they are words. What must not exist is a **line** that reads as
	 | structure, and that is exactly what escaping prevents.
	 |
	 */
	it("cannot be talked into a second event", () => {
		const lines = lines_of( document_for( {
			summary: "Free\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:Forged",
		} ) )

		expect( count_of( lines, "BEGIN:VEVENT" ) ).toBe( 1 )
		expect( count_of( lines, "END:VEVENT" ) ).toBe( 1 )
		expect( lines ).not.toContain( "SUMMARY:Forged" )
	})
})

/**
 |
 | Folding, which RFC 5545 requires at 75 octets — octets rather than
 | characters, so a name in a script that costs three bytes a letter folds
 | three times sooner than one in Latin.
 |
 */
describe("line folding", () => {
	it("keeps every line inside 75 octets", () => {
		const ics = document_for( {
			description:
				"A showcase of everything the fellows made over the course of "
				+ "the residency, shown across two afternoons in the pergola.",
		} )

		for ( const line of lines_of( ics ) ) {
			expect( octets( line ) ).toBeLessThanOrEqual( 75 )
		}
	})

	it("unfolds back to exactly what it was given", () => {
		const description = "x".repeat( 400 )
		const ics = unfolded( document_for( { description } ) )

		expect( ics ).toContain( `DESCRIPTION:${description}` )
	})

	it("counts octets rather than characters", () => {
		const ics = document_for( { summary: "मराठी".repeat( 20 ) } )

		for ( const line of lines_of( ics ) ) {
			expect( octets( line ) ).toBeLessThanOrEqual( 75 )
		}

		expect( unfolded( ics ) )
			.toContain( `SUMMARY:${"मराठी".repeat( 20 )}` )
	})
})

/**
 |
 | The uid is what makes adding the same instance twice an update rather than a
 | duplicate, so it has to be the same string every time it is derived and
 | different for every instance.
 |
 */
describe("the uid", () => {
	it("is the same for the same instance", () => {
		const one = calendar_uid( {
			host: "example.test",
			path: "/sessions/living-with-the-land",
			start: "2025-12-11T10:00:00.000+05:30",
		} )
		const again = calendar_uid( {
			host: "example.test",
			path: "/sessions/living-with-the-land",
			// The same instant, written with a different offset.
			start: "2025-12-11T04:30:00.000Z",
		} )

		expect( one ).toBe( again )
	})

	it("differs between two instances of one session", () => {
		const first = calendar_uid( {
			host: "example.test",
			path: "/sessions/living-with-the-land",
			start: "2025-12-11T10:00:00.000+05:30",
		} )
		const second = calendar_uid( {
			host: "example.test",
			path: "/sessions/living-with-the-land",
			start: "2025-12-12T14:00:00.000+05:30",
		} )

		expect( first ).not.toBe( second )
	})

	it("is qualified by the host, as a uid has to be", () => {
		expect( calendar_uid( {
			host: "example.test",
			path: "/sessions/living-with-the-land",
			start: "2025-12-11T10:00:00.000+05:30",
		} ) ).toMatch( /@example\.test$/ )
	})
})

/* _____
 | Which instance a control offers.
 |
 */

const MORNING = link(
	"2025-12-11T10:00:00.000+05:30",
	"2025-12-11T12:30:00.000+05:30",
)
const AFTERNOON = link(
	"2025-12-12T14:00:00.000+05:30",
	"2025-12-12T16:30:00.000+05:30",
)

function link ( start: string, end: string | null = null ) {
	return { end, href: `/calendar.ics?start=${start}`, start }
}

function at ( moment: string ) {
	return Date.parse( moment )
}

describe("which instance is offered", () => {
	/**
	 |
	 | No clock is the server's answer, and it is deliberately not "the first
	 | one in the array". A page's HTML is cached, so a decision made against
	 | the clock during rendering is a decision frozen into the cache — right
	 | when it was written and wrong for everybody served it afterwards. The
	 | server therefore answers a question the clock has no part in, and the
	 | browser corrects it on arrival.
	 |
	 */
	it("is the earliest instance when there is no clock", () => {
		expect( upcoming_link( [ AFTERNOON, MORNING ], null ) ).toBe( MORNING )
	})

	it("is the earliest instance still to come when there is one", () => {
		expect( upcoming_link(
			[ MORNING, AFTERNOON ],
			at( "2025-12-11T18:00:00.000+05:30" ),
		) ).toBe( AFTERNOON )
	})

	it("is nothing at all once every instance is over", () => {
		expect( upcoming_link(
			[ MORNING, AFTERNOON ],
			at( "2025-12-13T09:00:00.000+05:30" ),
		) ).toBe( null )
	})

	it("is nothing at all when there are no instances", () => {
		expect( upcoming_link( [], null ) ).toBe( null )
		expect( upcoming_link( [], at( "2025-12-11T09:00:00.000+05:30" ) ) )
			.toBe( null )
	})

	it("reads the instances in whatever order they arrive", () => {
		expect( upcoming_link(
			[ AFTERNOON, MORNING ],
			at( "2025-12-11T09:00:00.000+05:30" ),
		) ).toBe( MORNING )
	})
})

/**
 |
 | An instance is over when it has **ended**, not when it has begun.
 |
 | Somebody standing in the room during the first ten minutes is exactly the
 | person most likely to reach for the button, and a control that vanished on
 | the hour would be gone for them.
 |
 */
describe("when an instance is over", () => {
	it("is still on while it is running", () => {
		expect( is_over( MORNING, at( "2025-12-11T11:00:00.000+05:30" ) ) )
			.toBe( false )
	})

	/**
	 |
	 | At the exact end instant it has not *passed*, and the whole reason this
	 | judges the end rather than the start is to keep the control for somebody
	 | who is still standing in the room.
	 |
	 */
	it("is not yet over at the exact moment it ends", () => {
		expect( is_over( MORNING, at( "2025-12-11T12:30:00.000+05:30" ) ) )
			.toBe( false )
	})

	it("is over once its end has passed", () => {
		expect( is_over( MORNING, at( "2025-12-11T12:31:00.000+05:30" ) ) )
			.toBe( true )
	})

	it("falls back to the start where an instance has no end", () => {
		const open_ended = link( "2025-12-11T10:00:00.000+05:30" )

		expect( is_over( open_ended, at( "2025-12-11T09:59:00.000+05:30" ) ) )
			.toBe( false )
		expect( is_over( open_ended, at( "2025-12-11T10:01:00.000+05:30" ) ) )
			.toBe( true )
	})

	it("is never over without a clock to say so", () => {
		expect( is_over( MORNING, null ) ).toBe( false )
	})
})

function octets ( value: string ) {
	return new TextEncoder().encode( value ).length
}

function count_of ( lines: string[], line: string ) {
	return lines.filter( ( candidate ) => candidate === line ).length
}
