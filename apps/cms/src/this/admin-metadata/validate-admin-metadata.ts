
/**
 |
 | Checks a schema's `"__"` declaration against that schema's **actual**
 | attributes, and throws on the first mismatch.
 |
 | Thrown from the bootstrap, this refuses the boot. That is deliberate, and it
 | is the one exception to the rule that a check must never refuse to boot the
 | application its remedy lives inside: the remedy here is a schema file in this
 | repository, not a screen in the admin panel.
 |
 | What is checked:
 |
 |   • the keys of the `"__"` declaration itself, so that a `metadata` that
 |     should have been `metadatas` is a boot failure rather than a no-op;
 |   • every key of `metadatas` and of `metadatas_outside_production`;
 |   • every entry of `layouts.list`; and
 |   • every `name` in every row of `layouts.edit`.
 |
 | `id` and `documentId` count as attributes even though no schema declares
 | them, because the content manager adds both to the model it renders and a
 | list layout may legitimately name either.
 |
 */

export const ADMIN_METADATA_KEY = "__"

const RECOGNISED_KEYS = new Set( [
	// Merged into the content manager's stored configuration.
	"metadatas",
	"layouts",
	// Merged over `metadatas` first, and only where developer fields are shown
	// — `ADMIN_SHOW_DEVELOPER_FIELDS`, or the environment when that is unset.
	// See `configure-admin-metadata.ts`.
	"metadatas_outside_production",
	// Free text for whoever opens the file next. Ignored.
	"note",
] )

const IMPLICIT_ATTRIBUTES = [ "id", "documentId" ]

export function validate_admin_metadata ( uid: string, schema ) {
	const declaration = schema?.[ADMIN_METADATA_KEY]

	if ( declaration === undefined ) {
		return
	}

	if ( !is_object( declaration ) ) {
		throw invalid( uid, ADMIN_METADATA_KEY, `is not an object.` )
	}

	for ( const key of Object.keys( declaration ) ) {
		if ( !RECOGNISED_KEYS.has( key ) ) {
			throw invalid(
				uid,
				`${ADMIN_METADATA_KEY}.${key}`,
				`is not one of ${quoted( [ ...RECOGNISED_KEYS ] )}. `
					+ `A key that is not recognised is never read, so a misspelling `
					+ `here would otherwise do nothing at all.`,
			)
		}
	}

	const attributes = new Set( [
		...IMPLICIT_ATTRIBUTES,
		...Object.keys( schema?.attributes ?? {} ),
	] )

	validate_metadatas( uid, declaration.metadatas, attributes )
	validate_metadatas(
		uid,
		declaration.metadatas_outside_production,
		attributes,
		"metadatas_outside_production",
	)
	validate_layouts( uid, declaration.layouts, attributes )
}

function validate_metadatas (
	uid: string,
	metadatas,
	attributes: Set<string>,
	key = "metadatas",
) {
	if ( metadatas === undefined ) {
		return
	}

	if ( !is_object( metadatas ) ) {
		throw invalid(
			uid,
			`${ADMIN_METADATA_KEY}.${key}`,
			`is not an object.`,
		)
	}

	for ( const name of Object.keys( metadatas ) ) {
		if ( !attributes.has( name ) ) {
			throw unknown_attribute(
				uid,
				`${ADMIN_METADATA_KEY}.${key}.${name}`,
				name,
				attributes,
			)
		}
	}
}

function validate_layouts ( uid: string, layouts, attributes: Set<string> ) {
	if ( layouts === undefined ) {
		return
	}

	if ( !is_object( layouts ) ) {
		throw invalid(
			uid,
			`${ADMIN_METADATA_KEY}.layouts`,
			`is not an object.`,
		)
	}

	for ( const key of Object.keys( layouts ) ) {
		if ( key !== "list" && key !== "edit" ) {
			throw invalid(
				uid,
				`${ADMIN_METADATA_KEY}.layouts.${key}`,
				`is not one of "list", "edit".`,
			)
		}
	}

	validate_list_layout( uid, layouts.list, attributes )
	validate_edit_layout( uid, layouts.edit, attributes )
}

function validate_list_layout ( uid: string, list, attributes: Set<string> ) {
	if ( list === undefined ) {
		return
	}

	const path = `${ADMIN_METADATA_KEY}.layouts.list`

	if ( !Array.isArray( list ) ) {
		throw invalid( uid, path, `is not an array.` )
	}

	list.forEach( ( name, index ) => {
		if ( typeof name !== "string" ) {
			throw invalid(
				uid,
				`${path}[${index}]`,
				`is not an attribute name.`,
			)
		}

		if ( !attributes.has( name ) ) {
			throw unknown_attribute(
				uid,
				`${path}[${index}]`,
				name,
				attributes,
			)
		}
	} )
}

function validate_edit_layout ( uid: string, edit, attributes: Set<string> ) {
	if ( edit === undefined ) {
		return
	}

	const path = `${ADMIN_METADATA_KEY}.layouts.edit`

	if ( !Array.isArray( edit ) ) {
		throw invalid( uid, path, `is not an array of rows.` )
	}

	edit.forEach( ( row, row_index ) => {
		if ( !Array.isArray( row ) ) {
			throw invalid(
				uid,
				`${path}[${row_index}]`,
				`is not a row of fields.`,
			)
		}

		row.forEach( ( field, field_index ) => {
			const at = `${path}[${row_index}][${field_index}]`

			if ( !is_object( field ) || typeof field.name !== "string" ) {
				throw invalid( uid, at, `has no "name".` )
			}

			if ( !attributes.has( field.name ) ) {
				throw unknown_attribute(
					uid,
					`${at}.name`,
					field.name,
					attributes,
				)
			}
		} )
	} )
}

function unknown_attribute (
	uid: string,
	path: string,
	name: string,
	attributes: Set<string>,
) {
	return invalid(
		uid,
		path,
		`names "${name}", which is not an attribute of that schema. `
			+ `Its attributes are ${quoted( [ ...attributes ].sort() )}.`,
	)
}

function invalid ( uid: string, path: string, complaint: string ) {
	return new Error(
		`Admin metadata is invalid for "${uid}": ${path} ${complaint}\n`
			+ `Correct the "${ADMIN_METADATA_KEY}" declaration in that schema's file. `
			+ `The boot is refused rather than continued because the remedy is a `
			+ `file in this repository.`,
	)
}

function is_object ( value: unknown ): value is Record<string, any> {
	return value !== null && typeof value === "object"
		&& !Array.isArray( value )
}

function quoted ( values: string[] ) {
	return values.map( ( value ) => `"${value}"` ).join( ", " )
}
