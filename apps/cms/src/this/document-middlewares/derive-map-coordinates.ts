
/**
 |
 | Every map's pin is written into the hidden coordinate pair beside its URL.
 |
 | The website renders the embed from the coordinates rather than from the URL,
 | so that a page load parses nothing and the pin cannot come out differently
 | on the site than it did in the admin panel. Deriving here is what makes that
 | true: the reading happens once, in the one place that can refuse it.
 |
 | It amends the write rather than following it — the pair is set on
 | `context.params.data` **before** `next()`, so it lands in the same statement
 | and the same transaction as the URL it came from, exactly as
 | `derive-colour-triplets` sets its triplets. Deriving afterwards would leave
 | a window in which a URL and its coordinates disagreed.
 |
 | Registered after `reject-unreadable-map-url`, so by the time this runs every
 | URL still present has been read successfully once. It reads them again
 | rather than carrying the first reading across, because a middleware that
 | depended on another having run would be a middleware that broke silently
 | when the order in `index.ts` changed.
 |
 */

import type { Core } from "@strapi/strapi"

import { maps_being_written } from "./maps-being-written"
import { read_maps_url } from "./maps-url"

export function derive_map_coordinates ( strapi: Core.Strapi ) {
	return async function derive_then_continue ( context, next ) {
		for ( const map of maps_being_written( strapi, context ) ) {
			const reading = read_maps_url( map.place_url )

			// Unreachable behind the refusal above, and left here rather than
			// asserted: an unreadable URL should leave the stored pin alone,
			// which is the safer of the two things to do if this ever does
			// run on its own.
			if ( reading.outcome !== "read" ) {
				continue
			}

			map.latitude = reading.coordinates.latitude
			map.longitude = reading.coordinates.longitude
		}

		return await next()
	}
}
