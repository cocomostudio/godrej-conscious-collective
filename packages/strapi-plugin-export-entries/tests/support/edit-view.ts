import type { Fixture_Strapi } from "./boot-fixture-strapi.ts"

/**
 |
 | Renames fields, moves some to the top of the edit view and removes others
 | from it, through the same endpoint the panel's "Configure the view" page
 | uses. Fields named in neither list keep their places after the moved ones.
 |
 */
export async function configure_edit_view (
	cms: Fixture_Strapi,
	token: string,
	uid: string,
	{ labels, order, removed }: {
		labels: Record<string, string>
		order: string[]
		removed: string[]
	},
) {
	const path = `/content-manager/content-types/${uid}/configuration`
	const { body } = await cms.request( "GET", path, { token } )
	const { layouts, metadatas, settings } = body.data.contentType

	// The GET adds each relation's `mainField` for the panel's convenience,
	// and the PUT refuses it back.
	for ( const metadata of Object.values<any>( metadatas ) ) {
		delete metadata.edit?.mainField
		delete metadata.list?.mainField
	}

	for ( const [ name, label ] of Object.entries( labels ) ) {
		metadatas[name].edit.label = label
	}

	const rest = layouts.edit.flat()
		.filter( ( field ) =>
			!order.includes( field.name ) && !removed.includes( field.name )
		)
	const moved = order.map( ( name ) => ( { name, size: 6 } ) )

	const { status, body: answer } = await cms.request( "PUT", path, {
		body: {
			layouts: {
				...layouts,
				edit: [ ...moved, ...rest ].map( ( field ) => [ field ] ),
			},
			metadatas,
			settings,
		},
		token,
	} )

	if ( status !== 200 ) {
		throw new Error(
			`Configuring the edit view of ${uid} answered ${status}: `
				+ JSON.stringify( answer ),
		)
	}
}
