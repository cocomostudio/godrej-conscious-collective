import type { Core } from "@strapi/strapi"
import { contentTypes } from "@strapi/utils"

import { cell_of, joined_cell } from "./csv"
import type { Export_Request } from "./request"

/** One column of the CSV, and how to read it. */
export type Column = {
	label: string
	/** The attribute the column reads. */
	name: string
	/** How a relation or media column is populated. Unset for a scalar. */
	populate?: { select: string[]; where?: Record<string, unknown> }
	/** The cell for one row read from the database. */
	cell: ( row: any ) => string
}

/**
 |
 | The chosen fields' columns, then "Created at" and "Updated at".
 |
 | A relation reads only the related entries' display field, which is the
 | field the content manager is configured to show for the relation. A media
 | field reads only its files' URLs.
 |
 */
export async function columns_of (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
): Promise<Column[]> {
	const content_type = strapi.contentTypes[request.uid as any]
	const { metadatas } = await strapi.plugin( "content-manager" )
		.service( "content-types" )
		.findConfiguration( content_type )

	const columns = request.fields.map( ( { label, name } ) => {
		const attribute: any = content_type.attributes[name]

		if ( contentTypes.isMediaAttribute( attribute ) ) {
			return media_column( strapi, label, name, timezone )
		}

		if ( contentTypes.isRelationalAttribute( attribute ) ) {
			return relation_column(
				strapi,
				content_type,
				label,
				name,
				metadatas[name]?.edit?.mainField || "id",
				timezone,
			)
		}

		return scalar_column( label, name, attribute.type, timezone )
	} )

	return [
		...columns,
		scalar_column( "Created at", "createdAt", "datetime", timezone ),
		scalar_column( "Updated at", "updatedAt", "datetime", timezone ),
	]
}

function scalar_column (
	label: string,
	name: string,
	type: string,
	timezone: string,
): Column {
	return {
		cell: ( row ) => cell_of( row[name], type, timezone ),
		label,
		name,
	}
}

/**
 |
 | A relation's display values, one per related entry.
 |
 | Strapi links an entry without Draft & Publish to both versions of a related
 | entry that has Draft & Publish. Only the draft is read, so that each related
 | entry is written once, as the edit view shows it.
 |
 */
function relation_column (
	strapi: Core.Strapi,
	content_type: any,
	label: string,
	name: string,
	main_field: string,
	timezone: string,
): Column {
	const target = strapi.contentTypes[content_type.attributes[name].target]
	const type = main_field === "id"
		? "integer"
		: target.attributes[main_field]?.type ?? "string"
	const drafts_only = contentTypes.hasDraftAndPublish( target )
		&& !contentTypes.hasDraftAndPublish( content_type )

	return {
		cell: ( row ) => joined_cell(
			entries_of( row[name] ).map( ( entry ) => entry[main_field] ),
			type,
			timezone,
		),
		label,
		name,
		populate: {
			select: [ main_field ],
			...( drafts_only ? { where: { publishedAt: null } } : {} ),
		},
	}
}

/**
 |
 | A media field's file URLs. A file kept on the Strapi server has a URL that
 | starts with `/`, which a spreadsheet cannot open, so it is prefixed with the
 | server's public URL.
 |
 */
function media_column (
	strapi: Core.Strapi,
	label: string,
	name: string,
	timezone: string,
): Column {
	const server_url: string = strapi.config.get( "server.absoluteUrl" )

	return {
		cell: ( row ) => joined_cell(
			entries_of( row[name] ).map( ( { url } ) =>
				url.startsWith( "/" ) ? `${server_url}${url}` : url
			),
			"string",
			timezone,
		),
		label,
		name,
		populate: { select: [ "url" ] },
	}
}

/** A populated relation or media field, as a list whatever its size. */
function entries_of ( value: unknown ): any[] {
	if ( Array.isArray( value ) ) {
		return value
	}

	return value ? [ value ] : []
}
