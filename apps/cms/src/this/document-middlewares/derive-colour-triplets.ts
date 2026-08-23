
/**
 |
 | Every colour an event carries gets its RGB-channel triplet written into a
 | hidden sibling attribute.
 |
 | It amends the write rather than following it: the triplet is set on
 | `context.params.data` **before** `next()`, so it lands in the same statement
 | and the same transaction as the colour it was derived from. Deriving
 | afterwards would mean a second write, which a middleware cannot make through
 | the document service anyway, and would leave a window in which a colour and
 | its triplet disagreed.
 |
 | The pairs are read off the schema rather than listed here — an attribute is a
 | colour when an attribute of the same name plus `_rgb` sits beside it. Adding
 | a seventh colour is therefore two lines in the schema file and nothing here,
 | and a colour whose sibling was forgotten simply is not derived, rather than
 | being derived into an attribute that does not exist.
 |
 */

import type { Core } from "@strapi/strapi"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"
import { hex_to_rgb_triplet } from "./hex-to-rgb-triplet"

const UID = "api::event.event"
const RGB_SUFFIX = "_rgb"

export function derive_colour_triplets ( strapi: Core.Strapi ) {
	return async function derive_then_continue ( context, next ) {
		if ( !is_create_or_update( context, UID ) ) {
			return await next()
		}

		const data = incoming_data( context )

		if ( !data ) {
			return await next()
		}

		for ( const colour of colour_attributes( strapi ) ) {
			// Only what the caller sent. An update that does not mention a
			// colour must not blank the triplet of the colour already stored.
			if ( !( colour in data ) ) {
				continue
			}

			data[colour + RGB_SUFFIX] = hex_to_rgb_triplet( data[colour] )
		}

		return await next()
	}
}

function colour_attributes ( strapi: Core.Strapi ): string[] {
	const attributes = strapi.contentTypes[UID]?.attributes ?? {}

	return Object.keys( attributes ).filter( ( name ) =>
		!name.endsWith( RGB_SUFFIX )
		&& Object.prototype.hasOwnProperty.call(
			attributes,
			name + RGB_SUFFIX,
		)
	)
}
