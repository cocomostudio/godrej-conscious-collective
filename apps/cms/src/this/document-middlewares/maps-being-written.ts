
/**
 |
 | The maps a write is setting a URL on.
 |
 | Both map middlewares want exactly this list and nothing else, and neither
 | wants the other's verb. Kept here so that `reject-unreadable-map-url` is only
 | its refusal and `derive-map-coordinates` is only its derivation — and so the
 | component's UID is written down once rather than beside each of them.
 |
 | The `place_url` filter is part of the question rather than a tidying step.
 | An update naming three attributes says nothing about the rest of the entry,
 | so a map whose URL the caller did not send is a map they are not touching:
 | there is nothing there to refuse, and blanking the coordinates already
 | stored beside it would be the wrong thing to do.
 |
 */

import type { Core } from "@strapi/strapi"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"
import { components_in, schema_lookup } from "./components-in"

const MAP = "media.google-map-v1"

export function maps_being_written (
	strapi: Core.Strapi,
	context,
): Record<string, unknown>[] {
	if ( !is_create_or_update( context ) ) {
		return []
	}

	const data = incoming_data( context )

	if ( !data ) {
		return []
	}

	return components_in( MAP, context.uid, data, schema_lookup( strapi ) )
		.filter( ( map ) => map.place_url !== undefined )
}
