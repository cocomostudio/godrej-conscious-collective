
/**
 |
 | The pin inside a Google Maps URL, read out of the string and nothing else.
 |
 | This server sits behind a firewall that lets nothing out, so the short links
 | the Maps app's Share sheet hands out — `maps.app.goo.gl/…` — cannot be
 | resolved here: their coordinates only exist at the far end of a redirect.
 | They are therefore named as their own refusal, so the editor can be told the
 | one thing that fixes it rather than that their URL was "invalid".
 |
 | A Maps URL carries two coordinate pairs and they are not the same place:
 |
 |   `@19.0939921,72.9200579,17z`   where the editor's window was pointing
 |   `!3d19.0939921!4d72.9226328`   the pin itself
 |
 | In the seed's own URL those are 270 metres apart, so the order they are
 | tried in is the whole point of this module rather than a detail of it.
 |
 */

export type Coordinates = {
	latitude: number
	longitude: number
}

export type Refusal = "not_a_map" | "no_coordinates" | "short_link"

/**
 |
 | One `outcome` rather than an `ok` flag beside a `reason`.
 |
 | Not a style choice. This application inherits `strict: false` from Strapi's
 | own tsconfig, and with `strictNullChecks` off TypeScript will not narrow a
 | union on a **boolean** discriminant — `if ( !reading.ok )` leaves the
 | refusal's `reason` unreachable. It narrows a string discriminant in either
 | mode, so the outcome names itself and the two shapes stay separable.
 |
 */
export type Maps_Url_Reading =
	| { coordinates: Coordinates; outcome: "read" }
	| { outcome: Refusal }

/**
 |
 | The hosts whose URLs say nothing without a network round trip.
 |
 | `goo.gl` shortened more than maps and is retired for everything else, but a
 | `goo.gl/maps/…` in an editor's clipboard is still a map and still opaque, so
 | it earns the same message.
 |
 */
const SHORT_LINK_HOSTS = new Set( [ "goo.gl", "maps.app.goo.gl" ] )

/** `google.com`, `google.co.in`, `maps.google.com`, `www.google.de`… */
const GOOGLE_HOST = /(?:^|\.)google\.[a-z]{2,}(?:\.[a-z]{2,})?$/i

/** The pin, as Maps writes it into the `data=` blob: `!8m2!3d<lat>!4d<lng>`. */
const PIN = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/

/** The viewport centre: `@<lat>,<lng>,<zoom>z`. */
const VIEWPORT = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/

/** A bare `<lat>,<lng>`, which is what `?q=` holds for a shared coordinate. */
const PAIR = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/

export function read_maps_url ( url: unknown ): Maps_Url_Reading {
	const address = as_url( url )

	if ( !address ) {
		return { outcome: "not_a_map" }
	}

	const host = address.hostname.toLowerCase()

	if ( SHORT_LINK_HOSTS.has( host ) ) {
		return { outcome: "short_link" }
	}

	if ( !is_a_map( host, address.pathname ) ) {
		return { outcome: "not_a_map" }
	}

	// Most authoritative first. The pin is the place the editor chose; `q` is
	// a coordinate they were explicitly handed; `@` is only where the window
	// happened to be, and is the last resort rather than the obvious reading.
	const coordinates = pin_in( address.pathname )
		?? query_in( address )
		?? viewport_in( address.pathname )

	if ( !coordinates ) {
		return { outcome: "no_coordinates" }
	}

	return { coordinates, outcome: "read" }
}

/**
 |
 | A map is a Google host that is either `maps.…` or serving `/maps`.
 |
 | Both halves are needed: `maps.google.com/maps?q=…` is what the embed itself
 | redirects to, and `www.google.com/maps/place/…` is what the address bar
 | holds — while `www.google.com/search?q=…` is neither and must not pass.
 |
 */
function is_a_map ( host: string, pathname: string ): boolean {
	if ( !GOOGLE_HOST.test( host ) ) {
		return false
	}

	return host.startsWith( "maps." ) || pathname.startsWith( "/maps" )
}

function as_url ( url: unknown ): URL | null {
	if ( typeof url !== "string" || url.trim() === "" ) {
		return null
	}

	try {
		return new URL( url.trim() )
	} catch {
		return null
	}
}

function pin_in ( pathname: string ): Coordinates | null {
	return from_match( PIN.exec( pathname ) )
}

function viewport_in ( pathname: string ): Coordinates | null {
	return from_match( VIEWPORT.exec( pathname ) )
}

function query_in ( address: URL ): Coordinates | null {
	const query = address.searchParams.get( "q" )?.trim()

	return query ? from_match( PAIR.exec( query ) ) : null
}

/**
 |
 | A match's two capture groups as a coordinate, or nothing.
 |
 | The range check is not defensive tidiness. Every pattern here is a pair of
 | signed decimals, and plenty of numbers that shape are not places — so a
 | reading that is off the planet is treated as no reading at all, which lets
 | the next source be tried rather than a wrong pin being stored.
 |
 */
function from_match ( match: RegExpExecArray | null ): Coordinates | null {
	if ( !match ) {
		return null
	}

	const latitude = Number( match[1] )
	const longitude = Number( match[2] )

	if ( !Number.isFinite( latitude ) || !Number.isFinite( longitude ) ) {
		return null
	}

	if ( Math.abs( latitude ) > 90 || Math.abs( longitude ) > 180 ) {
		return null
	}

	return { latitude, longitude }
}
