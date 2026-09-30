
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
 | colour when an attribute of the same name plus `_rgb` or `__rgb` sits beside
 | it. Adding a colour is therefore two lines in a schema file and nothing here,
 | and a colour whose sibling was forgotten simply is not derived, rather than
 | being derived into an attribute that does not exist.
 |
 | **Most of an event's colours are not on the event.** Each palette colour is a
 | component holding a base colour and twelve button colours, so the write is
 | walked for those components as well as read at its top. Which components to
 | walk for is read off the schema too: any component an event attribute names
 | whose own attributes hold a pair.
 |
 | Only the website's triplets are ever read while a page renders, so this is
 | the one place any colour maths runs.
 |
 */

import type { Core } from "@strapi/strapi"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"
import {
	type Runtime_Schema,
	type Schema_Lookup,
	components_in,
	schema_lookup,
} from "./components-in"
import { hex_to_rgb_triplet } from "./hex-to-rgb-triplet"

const UID = "api::event.event"

/**
 |
 | Longest first, because `__rgb` also ends in `_rgb`: `base__color__rgb` read
 | with the short suffix would name a colour `base__color_` that does not exist.
 |
 */
const RGB_SUFFIXES = [ "__rgb", "_rgb" ]

export function derive_colour_triplets ( strapi: Core.Strapi ) {
	return async function derive_then_continue ( context, next ) {
		if ( !is_create_or_update( context, UID ) ) {
			return await next()
		}

		const data = incoming_data( context )

		if ( !data ) {
			return await next()
		}

		const schema_of = schema_lookup( strapi )

		derive_into( data, schema_of( UID ) )

		for ( const component of components_holding_colours( schema_of ) ) {
			const found = components_in( component, UID, data, schema_of )

			for ( const instance of found ) {
				derive_into( instance, schema_of( component ) )
			}
		}

		return await next()
	}
}

function derive_into (
	data: Record<string, unknown>,
	schema: Runtime_Schema | undefined,
) {
	for ( const [ colour, sibling ] of colour_pairs( schema ) ) {
		// Only what the caller sent. An update that does not mention a
		// colour must not blank the triplet of the colour already stored.
		if ( !( colour in data ) ) {
			continue
		}

		data[sibling] = hex_to_rgb_triplet( data[colour] )
	}
}

/** Each colour attribute and the sibling its triplet is written into. */
function colour_pairs (
	schema: Runtime_Schema | undefined,
): [ string, string ][] {
	const attributes = schema?.attributes ?? {}
	const pairs: [ string, string ][] = []

	for ( const name of Object.keys( attributes ) ) {
		if ( RGB_SUFFIXES.some( ( suffix ) => name.endsWith( suffix ) ) ) {
			continue
		}

		const sibling = RGB_SUFFIXES
			.map( ( suffix ) => name + suffix )
			.find( ( candidate ) =>
				Object.prototype.hasOwnProperty.call( attributes, candidate )
			)

		if ( sibling ) {
			pairs.push( [ name, sibling ] )
		}
	}

	return pairs
}

function components_holding_colours (
	schema_of: Schema_Lookup,
): string[] {
	const attributes = schema_of( UID )?.attributes ?? {}

	const named = Object.values( attributes )
		.filter( ( attribute ) => attribute.type === "component" )
		.map( ( attribute ) => attribute.component )
		.filter( ( uid ): uid is string => typeof uid === "string" )

	return [ ...new Set( named ) ].filter( ( uid ) =>
		colour_pairs( schema_of( uid ) ).length > 0
	)
}
