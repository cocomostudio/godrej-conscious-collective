
/**
 |
 | Minting and verifying the address behind Add to Calendar.
 |
 | The endpoint is driven **entirely by its query string**: it reads no entry
 | and asks the CMS nothing. That is what makes it a formatter rather than a
 | route — and it is also what makes this file necessary.
 |
 | ─── WHY IT IS SIGNED ───────────────────────────────────────────────────────
 |
 | An unsigned endpoint of this shape is a public machine for putting arbitrary
 | words into somebody's calendar under this site's own domain. Nothing worse
 | than that — the body is `text/calendar` behind `nosniff`, so it is never a
 | document on this origin, and RFC 5545 escaping keeps a crafted value from
 | becoming a second event — but "an invitation that appears to come from the
 | festival" is a real thing to be able to forge, and the domain is what lends
 | it credibility.
 |
 | The signature closes it: the endpoint honours only the links it minted
 | itself. Everything else is a 404.
 |
 | ─── WHAT THE SIGNATURE COVERS ──────────────────────────────────────────────
 |
 | A canonical serialisation of the parameters the endpoint reads, in a fixed
 | order, every one of them present even when empty. Two consequences follow,
 | and both are deliberate:
 |
 |   • a parameter the endpoint does **not** read cannot change what it
 |     answers, so a link pasted through something that appends its own
 |     tracking still works;
 |
 |   • the parameters may arrive in any order, because the canonical form is
 |     rebuilt from the whitelist rather than read off the request.
 |
 | ─── WHY MINTING HAPPENS SERVER-SIDE, AND WHAT THAT COSTS ───────────────────
 |
 | The secret cannot reach the browser, so every href a page carries has to be
 | minted while that page is being rendered. For a session's own sidebar that
 | is straightforward — root assembly puts the instances on the block and
 | `with_calendar_links` signs them.
 |
 | For the schedule it is not. That page's rows arrive spliced into a listing
 | component by the CMS, somewhere inside a region the website otherwise never
 | looks into, so there is nowhere to sign them but a pass over the assembled
 | tree. That pass is the price of signing, and it is the whole of `walk`
 | below. An unsigned endpoint would not have needed it.
 |
 */

import crypto from "node:crypto"

import type {
	Block,
	Session_Schedule_Row,
} from "./envelope.ts"
import type {
	Calendar_Instance,
	Calendar_Link,
} from "./calendar-links.ts"

import { ADD_TO_CALENDAR } from "./assemble-root.ts"
import { calendar_instances_of_row } from "./sessions.ts"

import { Environment } from "#infra/server/environment/index.ts"

/** Where the endpoint is mounted. Spelled again in `routes.ts`, which is a
 |  build-time config module and cannot import from a server one. */
const CALENDAR_PATH = "/calendar.ics"

/** The schedule page's listing, the one other block that draws these. */
const SCHEDULE_LIST = "list.session-schedule-list-v1"

/**
 |
 | The parameters the endpoint reads, and the order the signature covers them
 | in. Alphabetical for no reason beyond being a rule that cannot drift: what
 | matters is that minting and verifying agree, and a sorted whitelist is the
 | cheapest way to guarantee they do.
 |
 */
const SIGNED = [ "at", "end", "note", "path", "start", "title" ] as const

type Signed_Parameter = typeof SIGNED[number]

/**
 |
 | A cap on each value, so that a link cannot be grown without bound.
 |
 | Generous against real content — a session's name and standfirst are both
 | well inside it — and the point is only that the address stays an address.
 | Anything longer is truncated at minting rather than refused, because a
 | calendar entry with a clipped note is better than no button.
 |
 */
const MOST_CHARACTERS = 300

/**
 |
 | The address that adds one instance, or null when no secret is configured.
 |
 | Null rather than an unsigned link. A link this server cannot later verify is
 | a link that 404s when it is tapped, and a button that fails on press is
 | worse than a button that is not there.
 |
 */
export function calendar_link (
	instance: Calendar_Instance,
): Calendar_Link | null {
	const secret = Environment.get( "CALENDAR_LINK_SECRET" )

	if ( !secret || !instance.start || !instance.title ) {
		return null
	}

	const parameters = canonical( {
		at: instance.at,
		end: instance.end,
		note: instance.note,
		path: instance.path,
		start: instance.start,
		title: instance.title,
	} )

	const signature = sign( secret, parameters.toString() )
	parameters.set( "sig", signature )

	return {
		end: instance.end,
		href: `${CALENDAR_PATH}?${parameters}`,
		start: instance.start,
	}
}

/**
 |
 | The instance an address describes, or null when this server did not mint it.
 |
 | The signature is checked **before** anything is read out as though it meant
 | something, which is the same order `verify_form_token` follows and for the
 | same reason.
 |
 */
export function verify_calendar_link (
	search: URLSearchParams,
): Calendar_Instance | null {
	const secret = Environment.get( "CALENDAR_LINK_SECRET" )
	const given = search.get( "sig" )

	if ( !secret || !given ) {
		return null
	}

	const arrived = Object.fromEntries(
		SIGNED.map( ( name ) => [ name, search.get( name ) ?? "" ] ),
	) as Record<Signed_Parameter, string>

	const covered = canonical( arrived )

	if ( !signatures_match( sign( secret, covered.toString() ), given ) ) {
		return null
	}

	/**
	 |
	 | **Read back out of the canonical form, never off the request.**
	 |
	 | The two differ by exactly the clipping, and that gap was a hole: a
	 | parameter minted at the cap could have any amount of text appended to it,
	 | because the canonical form clipped the addition away before checking the
	 | signature and the raw value was then what got written into the file. The
	 | signature verified something shorter than what the entry said.
	 |
	 | Reading back from `covered` closes it by construction rather than by a
	 | second length check that could drift out of step with the first: what is
	 | returned is, definitionally, the string the signature covered.
	 |
	 */
	const values = Object.fromEntries(
		SIGNED.map( ( name ) => [ name, covered.get( name ) ?? "" ] ),
	) as Record<Signed_Parameter, string>

	if ( !values.start || !values.title ) {
		return null
	}

	return {
		at: values.at || null,
		end: values.end || null,
		note: values.note || null,
		// Signed, so it can only be a path this server put there — and
		// re-checked anyway, because the one parameter that becomes a link in
		// the finished entry is the one worth being sure about.
		path: is_a_site_path( values.path ) ? values.path : null,
		start: values.start,
		title: values.title,
	}
}

/**
 |
 | Sign every calendar control in an assembled page.
 |
 | Two blocks draw one: a session's own Add to Calendar, which root assembly
 | put the instances on, and the schedule's listing, whose rows each stand for a
 | single instance. Both are reached by one walk rather than by two lookups,
 | because a component can sit at any depth inside a region.
 |
 */
export function with_calendar_links<Node extends Block> ( root: Node ): Node {
	// The walk is shape-preserving — it only ever replaces a block's
	// attributes with walked ones — so the root comes back as what it went in
	// as, and a caller reading `page_layout` off it still can.
	return walk( root ) as Node
}

function signed ( block: Block ): Block {
	if ( block.__component === ADD_TO_CALENDAR ) {
		const instances = Array.isArray( block.instances )
			? block.instances as Calendar_Instance[]
			: []

		return {
			...block,
			links: instances
				.map( calendar_link )
				.filter( ( link ): link is Calendar_Link => link !== null ),
			// The unsigned facts have done their job and would otherwise be
			// streamed to the browser as a second, unusable copy.
			instances: undefined,
		}
	}

	if ( block.__component === SCHEDULE_LIST ) {
		const rows = Array.isArray( block.sessions )
			? block.sessions as Session_Schedule_Row[]
			: []

		return {
			...block,
			sessions: rows.map( ( row ) => ( {
				...row,
				// One entry per instance, positional — a row's control offers
				// its own instance, and `schedule_entries` pairs them by index.
				calendar_links: calendar_instances_of_row( row ).map( (
					instance,
				) => instance && calendar_link( instance ) ),
			} ) ),
		}
	}

	return block
}

/**
 |
 | A pass over the render tree, rebuilding only the branches that changed.
 |
 | It recurses into every array-valued attribute rather than into a declared
 | list of regions, because a block's regions are its own business and a
 | listing can sit inside any of them. A repeatable row carries no
 | `__component`, so the walk steps over rows without mistaking one for a node
 | — the same discriminator the renderer relies on.
 |
 */
function walk ( value: unknown ): unknown {
	if ( Array.isArray( value ) ) {
		const walked = value.map( walk )

		return walked.some( ( item, index ) => item !== value[index] )
			? walked
			: value
	}

	if ( !is_a_block( value ) ) {
		return value
	}

	const visited = signed( value )
	let changed = visited !== value
	const attributes: Record<string, unknown> = {}

	for ( const [ name, attribute ] of Object.entries( visited ) ) {
		const walked = walk( attribute )
		attributes[name] = walked
		changed ||= walked !== attribute
	}

	return changed ? attributes as Block : value
}

function is_a_block ( value: unknown ): value is Block {
	return typeof value === "object"
		&& value !== null
		&& !Array.isArray( value )
		&& typeof ( value as Block ).__component === "string"
}

/**
 |
 | The signed form: the whitelist, in order, every parameter present even when
 | it has no value.
 |
 | Present-when-empty is what makes **dropping** a parameter a forgery rather
 | than a shortcut. Were an empty one left out, a link could be stripped of its
 | venue and still verify.
 |
 */
function canonical (
	values: Record<Signed_Parameter, string | null>,
): URLSearchParams {
	return new URLSearchParams(
		SIGNED.map( (
			name,
		) => [ name, clipped( values[name] ) ] ),
	)
}

function clipped ( value: string | null ): string {
	return ( value ?? "" ).slice( 0, MOST_CHARACTERS )
}

/**
 |
 | A path on this site, and nothing that could be read as an address elsewhere.
 |
 | `//elsewhere.test` is a protocol-relative URL rather than a path: it turns
 | "join this to our own origin" into "go wherever this says". **So is
 | `/\elsewhere.test`** — the URL standard treats a backslash as a separator
 | for http and https, so `new URL( "/\\evil.test/x", origin )` resolves to
 | `http://evil.test/x` exactly as the two-slash form does. Checking only for
 | the slash catches the shape everybody knows and misses its twin.
 |
 */
function is_a_site_path ( value: string ): boolean {
	return value.startsWith( "/" ) && !/^\/[/\\]/.test( value )
}

function sign ( secret: string, payload: string ) {
	return crypto.createHmac( "sha256", secret ).update( payload )
		.digest( "hex" )
}

/**
 |
 | Constant time, and length-guarded because `timingSafeEqual` throws on
 | buffers of different lengths rather than answering false. The same pair of
 | reasons `verify_form_token` gives.
 |
 */
function signatures_match ( expected: string, given: string ) {
	if ( expected.length !== given.length ) {
		return false
	}

	return crypto.timingSafeEqual(
		Buffer.from( expected ),
		Buffer.from( given ),
	)
}
