
import type { Core } from "@strapi/strapi"

import { deep_merge_replacing_arrays } from "./deep-merge-replacing-arrays"
import {
	ADMIN_METADATA_KEY,
	validate_admin_metadata,
} from "./validate-admin-metadata"

/**
 |
 | Admin field labels, descriptions and form layouts, declared in the schema
 | files and written into the database at every boot.
 |
 | Each `schema.json` may carry a non-standard top-level `"__"` key. Strapi's
 | loaders copy a schema file's root keys onto the model they build and ignore
 | the ones they do not recognise, so the declaration rides along on the model
 | and arrives here as `strapi.contentTypes[ uid ].__`.
 |
 | What happens here: enumerate the user-defined components and content types,
 | read the content manager's plugin store, deep-merge each schema's `metadatas`
 | and `layouts` over the stored value, and write the result back. Arrays are
 | replaced rather than concatenated. So the file wins on every boot, and
 | anything the file does not mention survives from the database.
 |
 | This runs in the **user** bootstrap, which Strapi runs after every plugin's.
 | The content manager's own bootstrap has by then written a default
 | configuration for any schema the store had never seen, which is the value
 | being merged over.
 |
 | Every key is checked against the schema's actual attributes first, and a
 | mismatch throws — see `validate-admin-metadata.ts` for why a boot failure is
 | the right answer there.
 |
 */

const CONTENT_TYPE_STORE_PREFIX = "configuration_content_types"
const COMPONENT_STORE_PREFIX = "configuration_components"

export async function configure_admin_metadata ( strapi: Core.Strapi ) {
	const store = strapi.store( { type: "plugin", name: "content_manager" } )

	for ( const uid of user_defined_component_uids( strapi ) ) {
		await apply_declared_metadata(
			COMPONENT_STORE_PREFIX,
			uid,
			strapi.components[uid],
			store,
		)
	}

	for ( const uid of user_defined_content_type_uids( strapi ) ) {
		await apply_declared_metadata(
			CONTENT_TYPE_STORE_PREFIX,
			uid,
			strapi.contentTypes[uid],
			store,
		)
	}
}

/**
 |
 | Components declared in `src/components/`, as opposed to those a plugin
 | brought with it.
 |
 */
function user_defined_component_uids ( strapi: Core.Strapi ) {
	return Object.keys( strapi.components ).filter( ( uid ) =>
		!uid.startsWith( "plugin::" )
	)
}

/**
 |
 | Content types declared in `src/api/`, as opposed to the admin's own, a
 | plugin's, or Strapi's internal ones.
 |
 */
function user_defined_content_type_uids ( strapi: Core.Strapi ) {
	return Object.keys( strapi.contentTypes ).filter( ( uid ) =>
		uid.startsWith( "api::" )
	)
}

async function apply_declared_metadata (
	store_prefix: string,
	uid: string,
	schema,
	store: ReturnType<Core.Strapi["store"]>,
) {
	validate_admin_metadata( uid, schema )

	const declaration = schema?.[ADMIN_METADATA_KEY]
	const declared = {
		...( declaration?.metadatas
			? { metadatas: declaration.metadatas }
			: {} ),
		...( declaration?.layouts ? { layouts: declaration.layouts } : {} ),
	}

	if ( Object.keys( declared ).length === 0 ) {
		return
	}

	const key = `${store_prefix}::${uid}`
	const stored = await store.get( { key } ) ?? {}

	await store.set( {
		key,
		value: deep_merge_replacing_arrays( stored, declared ),
	} )
}
