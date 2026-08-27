
/**
 |
 | Every instance of one component inside a write, however deep it sits.
 |
 | The middlewares in this directory have so far each watched a single content
 | type and read attributes off the top of it. A component cannot be watched
 | that way: `media.google-map-v1` appears on no content type directly, but
 | inside `container.map-and-content-v1`, inside a `container.section-v1`
 | dynamic zone, inside the regions of a Page, a Session, an Event and a Page
 | Shell. An invariant that belongs to the component has to be enforced at
 | every one of those addresses or at none of them.
 |
 | So the write is walked rather than indexed, and it is walked **through the
 | schema** rather than by looking for likely-shaped objects. The difference
 | matters in one direction: only a dynamic zone's entries carry a
 | `__component` marker. A single component attribute — `map` on a map-and-
 | content — arrives as a bare object that says nothing about what it is, and
 | the only thing that knows is the schema.
 |
 | The objects come back **by reference**, because amending a write means
 | writing into `params.data` in place.
 |
 */

import type { Core } from "@strapi/strapi"

export type Runtime_Attribute = {
	component?: string
	components?: string[]
	repeatable?: boolean
	type?: string
}

export type Runtime_Schema = {
	attributes?: Record<string, Runtime_Attribute>
}

/** `strapi.contentTypes[uid] ?? strapi.components[uid]`, in the live case. */
export type Schema_Lookup = ( uid: string ) => Runtime_Schema | undefined

export function components_in (
	target: string,
	uid: string,
	data: unknown,
	schema_of: Schema_Lookup,
): Record<string, unknown>[] {
	const found: Record<string, unknown>[] = []

	collect( target, uid, data, schema_of, found )

	return found
}

function collect (
	target: string,
	uid: string,
	node: unknown,
	schema_of: Schema_Lookup,
	found: Record<string, unknown>[],
): void {
	const attributes = schema_of( uid )?.attributes

	if ( !attributes || !is_object( node ) ) {
		return
	}

	for ( const [ name, attribute ] of Object.entries( attributes ) ) {
		// Only what the caller sent. An update naming three attributes says
		// nothing about the rest of the entry, and walking into what is not
		// there would be walking into the stored row rather than the write.
		if ( !( name in node ) ) {
			continue
		}

		if ( attribute.type === "component" && attribute.component ) {
			for ( const entry of as_entries( node[name] ) ) {
				visit( target, attribute.component, entry, schema_of, found )
			}
		}

		if ( attribute.type === "dynamiczone" ) {
			for ( const entry of as_entries( node[name] ) ) {
				const component = is_object( entry )
					? entry.__component
					: undefined

				if ( typeof component === "string" ) {
					visit( target, component, entry, schema_of, found )
				}
			}
		}
	}
}

/**
 |
 | Collect this node if it is the one wanted, and walk into it regardless.
 |
 | Both, rather than one or the other: a component that matches can still hold
 | another of the same kind further down, and nothing in the catalogue promises
 | it never will.
 |
 */
function visit (
	target: string,
	uid: string,
	node: unknown,
	schema_of: Schema_Lookup,
	found: Record<string, unknown>[],
): void {
	if ( !is_object( node ) ) {
		return
	}

	if ( uid === target ) {
		found.push( node )
	}

	collect( target, uid, node, schema_of, found )
}

/** A repeatable component and a dynamic zone hold arrays; a single one does not. */
function as_entries ( value: unknown ): unknown[] {
	if ( value === null || value === undefined ) {
		return []
	}

	return Array.isArray( value ) ? value : [ value ]
}

function is_object ( value: unknown ): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray( value )
}

/**
 |
 | The lookup as the running application answers it.
 |
 | Two registries rather than one: a write starts at a content type and every
 | step after it is a component, and Strapi keeps those in separate maps.
 |
 */
export function schema_lookup ( strapi: Core.Strapi ): Schema_Lookup {
	return ( uid ) =>
		( strapi.contentTypes[uid] ?? strapi.components[uid] ) as
			| Runtime_Schema
			| undefined
}
