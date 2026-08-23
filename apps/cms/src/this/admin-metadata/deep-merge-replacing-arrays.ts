
/**
 |
 | A deep merge in which arrays are **replaced wholesale** rather than
 | concatenated.
 |
 | The admin's `layouts.edit` is an array of rows and `layouts.list` is an array
 | of attribute names. Concatenating either against what the database already
 | holds would duplicate every field on every boot, so a file that declares a
 | layout must state that layout in full and win outright.
 |
 | Plain objects merge key by key. Everything else — arrays, primitives, `null`
 | — is taken from the override and cloned, so nothing the caller writes back
 | into the store shares structure with the schema object Strapi loaded.
 |
 */

export function deep_merge_replacing_arrays (
	base: unknown,
	override: unknown,
) {
	// Either there is nothing to merge into, or nothing mergeable to merge.
	if ( !is_plain_object( base ) || !is_plain_object( override ) ) {
		return structuredClone( override )
	}

	const merged: Record<string, unknown> = { ...base }

	for ( const key of Object.keys( override ) ) {
		merged[key] = deep_merge_replacing_arrays( base[key], override[key] )
	}

	return merged
}

function is_plain_object ( value: unknown ): value is Record<string, unknown> {
	if (
		value === null || typeof value !== "object" || Array.isArray( value )
	) {
		return false
	}

	const prototype = Object.getPrototypeOf( value )

	return prototype === Object.prototype || prototype === null
}
