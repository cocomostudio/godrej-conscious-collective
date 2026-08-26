
/**
 |
 | The iCalendar document — RFC 5545, one VEVENT, nothing else.
 |
 | This is what a phone hands to its calendar app when a visitor taps Add to
 | Calendar. It is deliberately the plainest possible file: no VTIMEZONE, no
 | alarms, no recurrence. A session that runs on three days is three separate
 | entries a visitor picks between, not one recurring one, because the instances
 | of a festival do not recur on a rule.
 |
 | ─── EVERY VALUE HERE CAME OUT OF A QUERY STRING ────────────────────────────
 |
 | The endpoint that calls this reads no entry and asks the CMS nothing — see
 | `calendar.route.ts` — so nothing below may assume its input is well behaved.
 | Escaping is not tidiness here, it is the boundary: a comma, a semicolon, a
 | backslash and a newline all mean something structural in RFC 5545, and an
 | unescaped newline in a session's name would end the property and let
 | everything after it be read as fresh lines. Which is a second VEVENT minted
 | by typing one.
 |
 | ─── FOLDING IS TRANSPORT, ESCAPING IS CONTENT ──────────────────────────────
 |
 | The two are separate passes and in that order. Escaping decides what the
 | value says; folding decides how the line is carried, at 75 **octets** rather
 | than characters, so a name in Devanagari folds three times sooner than one
 | in Latin. A reader unfolds before it reads, so folding can never change
 | meaning — provided it never splits a character in half, which is why the
 | walk below counts code points and their encoded sizes rather than slicing
 | the string.
 |
 */

/** Identifies the software that wrote the file, per RFC 5545 §3.7.3. */
const PRODUCT = "-//Godrej Conscious Collective//Website//EN"

/** RFC 5545 §3.1: a content line is at most 75 octets, excluding the CRLF. */
const MOST_OCTETS_PER_LINE = 75

const CRLF = "\r\n"

export type Calendar_Event = {
	/**
	 |
	 | Stable for a given instance, so that adding the same one twice is an
	 | update rather than a duplicate in the visitor's calendar. See
	 | `calendar_uid`.
	 |
	 */
	uid: string
	/** When this file was written, which RFC 5545 requires on every VEVENT. */
	stamped_at: Date
	/** ISO instant. */
	start: string
	/** ISO instant, or null for an instance with no stated end. */
	end: string | null
	summary: string
	description: string | null
	location: string | null
	/** An absolute address on this site. **Not** escaped — see below. */
	url: string | null
}

export function ics_document ( event: Calendar_Event ): string {
	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		`PRODID:${PRODUCT}`,
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${text( event.uid )}`,
		`DTSTAMP:${stamp( event.stamped_at )}`,
		...property( "DTSTART", instant( event.start ) ),
		...property( "DTEND", instant( event.end ) ),
		...property( "SUMMARY", text( event.summary ) ),
		...property( "DESCRIPTION", text( event.description ) ),
		...property( "LOCATION", text( event.location ) ),
		// A URI value is not TEXT and takes its characters literally: a comma
		// escaped inside one would be a comma in the address a calendar opens.
		// It is safe unescaped because the endpoint builds it from a path
		// against this server's own origin rather than taking it as given.
		...property( "URL", event.url ),
		"END:VEVENT",
		"END:VCALENDAR",
	]

	// CRLF terminates each line rather than separating them, the closing one
	// included — a reader working line by line is entitled to the terminator
	// on the line that ends the file.
	return lines.map( fold ).join( CRLF ) + CRLF
}

/**
 |
 | The identity of one instance.
 |
 | Derived rather than stored, from the two things that make an instance what it
 | is: which session it belongs to, and when it starts. Deriving it means the
 | same instance produces the same uid every time it is asked for — from either
 | copy of the sidebar, from the schedule, and from a link somebody kept — so a
 | visitor who adds it twice ends up with one entry rather than two.
 |
 | The start is normalised to UTC first, so that the same instant written with
 | a different offset does not mint a second identity.
 |
 | Qualified with the host because RFC 5545 asks a uid to be globally unique
 | and a bare slug is only unique here.
 |
 */
export function calendar_uid (
	{ host, path, start }: { host: string; path: string; start: string },
): string {
	const moment = instant( start ) ?? "undated"

	return `${slug( path )}-${moment}@${host}`
}

/**
 |
 | An ISO instant as RFC 5545's UTC form — `20251211T043000Z`.
 |
 | UTC rather than the event's own offset, because an offset alone does not
 | name a zone: a calendar handed `+05:30` would need a VTIMEZONE block to
 | place the entry, and the one form that needs no such block and cannot be
 | misread is the instant itself.
 |
 */
function instant ( value: string | null ): string | null {
	if ( typeof value !== "string" || value === "" ) {
		return null
	}

	const parsed = new Date( value )

	return Number.isNaN( parsed.getTime() ) ? null : stamp( parsed )
}

function stamp ( moment: Date ): string {
	return moment.toISOString().replace( /[-:]/g, "" ).replace( /\.\d+/, "" )
}

/** A property, or nothing at all where there is no value to write. */
function property ( name: string, value: string | null ): string[] {
	return value === null || value === "" ? [] : [ `${name}:${value}` ]
}

/**
 |
 | RFC 5545 §3.3.11. The backslash goes first, or it would escape the escapes
 | the later replacements add.
 |
 | A carriage return becomes `\n` alongside a line feed: the escape stands for
 | "a new line in this value", and there is no separate escape for a CR.
 |
 */
function text ( value: string | null ): string | null {
	if ( typeof value !== "string" ) {
		return null
	}

	return value
		.replaceAll( "\\", "\\\\" )
		.replaceAll( ";", "\\;" )
		.replaceAll( ",", "\\," )
		.replace( /\r\n|\r|\n/g, "\\n" )
}

/**
 |
 | Fold a content line to 75 octets, continuing with CRLF and a single space.
 |
 | The leading space of a continuation counts towards its own 75, which is why
 | the accumulator restarts at one rather than at zero. The walk is over code
 | points rather than over the string's indices, so a multi-byte character is
 | never cut in half — a split character is not a long line, it is a corrupt
 | file.
 |
 */
function fold ( line: string ): string {
	if ( octets( line ) <= MOST_OCTETS_PER_LINE ) {
		return line
	}

	const folded: string[] = []
	let current = ""
	let width = 0

	for ( const character of line ) {
		const size = octets( character )

		if ( width + size > MOST_OCTETS_PER_LINE ) {
			folded.push( current )
			current = ""
			// The space that opens the continuation line.
			width = 1
		}

		current += character
		width += size
	}

	folded.push( current )

	return folded.join( `${CRLF} ` )
}

function octets ( value: string ): number {
	return new TextEncoder().encode( value ).length
}

/**
 |
 | A path reduced to something that reads as an identifier — `/sessions/x`
 | becomes `sessions-x`. Only ever used inside a uid, where what matters is
 | that it is stable and distinct rather than that it is pretty.
 |
 */
function slug ( path: string ): string {
	return path
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, "-" )
		.replace( /^-+|-+$/g, "" )
		|| "entry"
}
