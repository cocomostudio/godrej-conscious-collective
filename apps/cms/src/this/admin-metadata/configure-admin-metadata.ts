
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
 | A schema may also carry `metadatas_outside_production`, which is merged over
 | `metadatas` before any of that happens and only where developer fields are
 | shown. It is how a field is shown to a developer and hidden from an editor —
 | see `should_show_developer_fields` below for what decides that.
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

	const show_developer_fields = should_show_developer_fields()
	// ↑ Answered once, here, before a single schema is looked at. An unreadable
	// 	flag throws, and it has to throw whether or not the first schema that
	// 	comes back from the loader happens to declare a field for it to govern —
	// 	otherwise whether a typo is caught depends on iteration order.

	for ( const uid of user_defined_component_uids( strapi ) ) {
		await apply_declared_metadata(
			COMPONENT_STORE_PREFIX,
			uid,
			strapi.components[uid],
			store,
			show_developer_fields,
		)
	}

	for ( const uid of user_defined_content_type_uids( strapi ) ) {
		await apply_declared_metadata(
			CONTENT_TYPE_STORE_PREFIX,
			uid,
			strapi.contentTypes[uid],
			store,
			show_developer_fields,
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
	show_developer_fields: boolean,
) {
	validate_admin_metadata( uid, schema )

	const declaration = schema?.[ADMIN_METADATA_KEY]
	const metadatas = metadatas_to_apply( declaration, show_developer_fields )
	const declared = {
		...( metadatas ? { metadatas } : {} ),
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

/**
 |
 | The `metadatas` to write: the declared ones outright, or the declared ones
 | with `metadatas_outside_production` merged over them.
 |
 | **Both halves state the same keys, and the base half states the production
 | value.** That is what makes the switch travel in both directions: a boot with
 | developer fields hidden writes the hidden value back over whatever a boot
 | that showed them left in the store, rather than leaving a key nobody sets
 | again.
 |
 */
function metadatas_to_apply ( declaration, show_developer_fields: boolean ) {
	const declared = declaration?.metadatas
	const outside = declaration?.metadatas_outside_production

	if ( !outside || !show_developer_fields ) {
		return declared
	}

	return deep_merge_replacing_arrays( declared ?? {}, outside )
}

/**
 |
 | Whether a schema's `metadatas_outside_production` is applied.
 |
 | `ADMIN_SHOW_DEVELOPER_FIELDS` answers it outright wherever it is set, and the
 | environment answers it wherever the flag is not. The flag exists because the
 | two are not the same question: whether this is a production deployment
 | decides how the application *behaves*, and whether an editor should meet the
 | fields that exist for the seed script decides what one *form* looks like.
 |
 | A staging server is the case that pulls them apart. It runs as production in
 | every way that matters and is still somewhere a developer wants to see a
 | seeded picture's address — and, going the other way, a developer chasing what
 | an editor actually sees wants the production form on a machine that is not
 | production. Before this flag, neither was reachable without lying about
 | `NODE_ENV`, which would have moved a great deal more than one field.
 |
 | Unset and empty both mean unset, so a deployment can hand the decision back
 | to the environment by emptying the variable rather than by deleting the line.
 |
 */
function should_show_developer_fields () {
	return read_developer_fields_flag( process.env.ADMIN_SHOW_DEVELOPER_FIELDS )
		?? outside_production()
}

/**
 |
 | `"true"` or `"false"`, and **nothing else** — an unrecognised value throws
 | rather than falling back to the environment.
 |
 | Falling back would be the worst of the three answers available. Somebody who
 | wrote `ADMIN_SHOW_DEVELOPER_FIELDS=flase` was reaching for a field an editor
 | must not see, and would get an admin panel showing it with nothing anywhere
 | to say the flag they set was never read. This is the reading
 | `config/database.ts` takes of an unknown `DATABASE_CLIENT`, for the reason it
 | gives there: a default that quietly replaces a stated intention is worse than
 | a boot that stops.
 |
 */
function read_developer_fields_flag ( raw: string | undefined ) {
	if ( raw === undefined || raw === "" ) {
		return undefined
	}

	if ( raw === "true" ) {
		return true
	}

	if ( raw === "false" ) {
		return false
	}

	throw new Error(
		`ADMIN_SHOW_DEVELOPER_FIELDS is "${raw}", which is neither "true" nor `
			+ `"false". Set it to one of those, or empty it to let the environment `
			+ `decide. The boot is refused rather than continued because a flag that `
			+ `is quietly not read would show an editor the fields it was set to `
			+ `hide.`,
	)
}

/**
 |
 | Whether this is anything other than a production environment.
 |
 | An unset `NODE_ENV` is a developer's shell, so it counts as development —
 | the same reading `scripts/seed/guards.ts` takes. The test is for production
 | rather than for development because `strapi develop`, `vitest` and a bare
 | `node` each name themselves differently, and only one name has to be right
 | for a field to stay hidden from an editor.
 |
 */
function outside_production () {
	return ( process.env.NODE_ENV ?? "development" ) !== "production"
}
