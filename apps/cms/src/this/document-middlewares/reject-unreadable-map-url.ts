
/**
 |
 | A map whose URL names no place on earth is refused.
 |
 | It throws **before** `next()`, for the reason `reject-inverted-date-range`
 | sets out: the write's transaction opens inside `next()`, so a middleware
 | that refuses afterwards refuses nothing.
 |
 | The three messages are the point of the file. This server is firewalled out
 | of every outbound request, so the short link the Maps app's Share sheet
 | produces can never be resolved here — and an editor who pastes one has done
 | the obvious thing rather than the wrong thing. Telling them their URL was
 | "invalid" would leave them with no move; telling them to open it and copy
 | the address bar is the whole remedy, delivered at the moment they need it.
 |
 | Unlike the date range, nothing is read from the database first. A component
 | is replaced wholesale on update rather than merged, so the URL being written
 | is the only URL there will be — an attribute the caller did not send is a
 | map they are not touching, and is passed over.
 |
 */

import type { Core } from "@strapi/strapi"

import { errors } from "@strapi/utils"

import type { Refusal } from "./maps-url"

import { maps_being_written } from "./maps-being-written"
import { read_maps_url } from "./maps-url"

const HOW_TO_COPY_ONE =
	"Open the place in Google Maps in a browser, then copy the address from "
	+ "the browser's own address bar."

const COMPLAINTS: Record<Refusal, string> = {
	no_coordinates:
		"This Google Maps address does not point at any one place. Search for "
		+ "the place, or click the map to drop a pin on it, and copy the "
		+ "address again once the map has moved to it.",
	not_a_map:
		`This is not a Google Maps address. ${HOW_TO_COPY_ONE}`,
	// The one an editor will actually hit, and the only one that is their
	// tool's doing rather than their own: Share hands out a short link, and
	// what it stands for is only known to Google's redirector.
	// Names the remedy for the link already in their clipboard rather than
	// sending them back to Maps: the short link does resolve, just not here.
	short_link:
		"This is a Google Maps short link, and it says nothing this server can "
		+ "read — where it points is known only to Google, and this server "
		+ "cannot reach them to ask. Open this link in a new browser tab, wait "
		+ "for it to land on the map, and copy the longer address that the "
		+ "browser's own address bar then shows.",
}

export function reject_unreadable_map_url ( strapi: Core.Strapi ) {
	return async function refuse_or_continue ( context, next ) {
		for ( const map of maps_being_written( strapi, context ) ) {
			const reading = read_maps_url( map.place_url )

			if ( reading.outcome !== "read" ) {
				throw new errors.ValidationError( COMPLAINTS[reading.outcome] )
			}
		}

		return await next()
	}
}
