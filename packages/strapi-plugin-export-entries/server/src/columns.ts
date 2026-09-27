import type { Core } from "@strapi/strapi"
import { contentTypes } from "@strapi/utils"

import { cell_of, joined_cell, text_of } from "./csv"
import type { Access, Where } from "./permissions"
import type { Export_Request } from "./request"

/** One column of the CSV, and how to read it. */
export type Column = {
	label: string
	/** The attribute the column reads. */
	name: string
	/** How a relation or media column is populated. Unset for a scalar. */
	populate?: { select: string[]; where?: Record<string, unknown> }
	/**
	 |
	 | Reads what the cells of one batch of rows need beyond the rows
	 | themselves. Runs once per batch, before `cell`. Unset when the rows are
	 | enough.
	 |
	 */
	prepare?: ( rows: any[] ) => Promise<void>
	/** The cell for one row read from the database. */
	cell: ( row: any ) => string
}

/**
 |
 | The chosen fields' columns, then "Created at" and "Updated at", then
 | "Status" when the export reads every entry of a Draft & Publish
 | content-type.
 |
 | A relation reads only the related entries' display field, which is the
 | field the content manager is configured to show for the relation. A media
 | field reads only its files' URLs.
 |
 | A field the admin can read on only some rows is left empty on the others.
 |
 */
export async function columns_of (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
	access: Access,
): Promise<Column[]> {
	const content_type = strapi.contentTypes[request.uid as any]
	const { metadatas } = await strapi.plugin( "content-manager" )
		.service( "content-types" )
		.findConfiguration( content_type )

	const scopes = await access.field_scopes(
		request.uid,
		request.fields.map( ( field ) => field.name ),
	)

	const columns = await Promise.all( request.fields.map( async ( field ) => {
		const { label, name } = field
		const attribute: any = content_type.attributes[name]

		const column = contentTypes.isMediaAttribute( attribute )
			? media_column( strapi, label, name, timezone )
			: contentTypes.isRelationalAttribute( attribute )
			? await relation_column(
				strapi,
				access,
				content_type,
				label,
				name,
				metadatas[name]?.edit?.mainField || "id",
				timezone,
			)
			: scalar_column( label, name, attribute.type, timezone )

		const scope = scopes.get( name )

		return scope ? scoped( strapi, request.uid, column, scope ) : column
	} ) )

	return [
		...columns,
		scalar_column( "Created at", "createdAt", "datetime", timezone ),
		scalar_column( "Updated at", "updatedAt", "datetime", timezone ),
		...( request.status === "all"
			? [ status_column( strapi, request.uid ) ]
			: [] ),
	]
}

/**
 |
 | Whether each draft's entry is a Draft, is Published, or "Contains
 | un-published edits". An entry holds un-published edits when its draft was
 | saved after its published version, which is the rule the edit view follows
 | too.
 |
 | The column reads each row's document ID. It reads the row's update time
 | from the "Updated at" column, which every export holds.
 |
 */
function status_column ( strapi: Core.Strapi, uid: string ): Column {
	let published_updated_at = new Map<string, number>()

	return {
		cell ( row ) {
			const published = published_updated_at.get( row.documentId )

			if ( published === undefined ) {
				return "Draft"
			}

			return new Date( row.updatedAt ).getTime() > published
				? "Contains un-published edits"
				: "Published"
		},
		label: "Status",
		name: "documentId",
		async prepare ( rows ) {
			const published = await strapi.db.query( uid as any ).findMany( {
				select: [ "documentId", "updatedAt" ],
				where: {
					documentId: { $in: rows.map( ( row ) => row.documentId ) },
					publishedAt: { $notNull: true },
				},
			} )

			published_updated_at = new Map( published.map( ( entry ) => [
				entry.documentId,
				new Date( entry.updatedAt ).getTime(),
			] ) )
		},
	}
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
 | A column that is left empty on the rows outside `scope`, the `where` of the
 | rows on which the admin can read the column's field.
 |
 */
function scoped (
	strapi: Core.Strapi,
	uid: string,
	column: Column,
	scope: Where,
): Column {
	let shown = new Set<number>()

	return {
		...column,
		cell: ( row ) => shown.has( row.id ) ? column.cell( row ) : "",
		async prepare ( rows ) {
			await column.prepare?.( rows )
			shown = await ids_within(
				strapi,
				uid,
				rows.map( ( row ) => row.id ),
				scope,
			)
		},
	}
}

/**
 |
 | A relation's display values, one per related entry.
 |
 | The edit view shows a related entry's display field only when the admin
 | can read that field on that entry. Otherwise it shows the entry's document
 | ID, and so does the export.
 |
 | Strapi links an entry without Draft & Publish to both versions of a related
 | entry that has Draft & Publish. Only the draft is read, so that each related
 | entry is written once, as the edit view shows it.
 |
 */
async function relation_column (
	strapi: Core.Strapi,
	access: Access,
	content_type: any,
	label: string,
	name: string,
	main_field: string,
	timezone: string,
): Promise<Column> {
	const target_uid = content_type.attributes[name].target
	const target = strapi.contentTypes[target_uid]
	const type = main_field === "id"
		? "integer"
		: target.attributes[main_field]?.type ?? "string"
	const drafts_only = contentTypes.hasDraftAndPublish( target )
		&& !contentTypes.hasDraftAndPublish( content_type )

	if ( !access.can_read_field( target_uid, main_field ) ) {
		return {
			cell: ( row ) => joined_cell(
				entries_of( row[name] ).map( ( entry ) => entry.documentId ),
				"string",
				timezone,
			),
			label,
			name,
			populate: {
				select: [ "documentId" ],
				...( drafts_only ? { where: { publishedAt: null } } : {} ),
			},
		}
	}

	const readable = await access.readable_rows( target_uid )
	let shown: Set<number> | undefined

	return {
		cell ( row ) {
			const entries = entries_of( row[name] )

			const all_shown = entries.every( ( entry ) => shown?.has( entry.id ) )

			if ( !shown || all_shown ) {
				return joined_cell(
					entries.map( ( entry ) => entry[main_field] ),
					type,
					timezone,
				)
			}

			return joined_cell(
				entries.map( ( entry ) =>
					shown!.has( entry.id )
						? text_of( entry[main_field], type, timezone )
						: entry.documentId
				),
				"string",
				timezone,
			)
		},
		label,
		name,
		populate: {
			select: [ "id", "documentId", main_field ],
			...( drafts_only ? { where: { publishedAt: null } } : {} ),
		},
		prepare: Object.keys( readable ).length === 0
			? undefined
			: async ( rows ) => {
				shown = await ids_within(
					strapi,
					target_uid,
					rows.flatMap( ( row ) =>
						entries_of( row[name] ).map( ( entry ) => entry.id )
					),
					readable,
				)
			},
	}
}

/** Which of the entries with the given IDs fall within `where`. */
async function ids_within (
	strapi: Core.Strapi,
	uid: string,
	ids: number[],
	where: Where,
): Promise<Set<number>> {
	if ( ids.length === 0 ) {
		return new Set()
	}

	const within = await strapi.db.query( uid as any ).findMany( {
		select: [ "id" ],
		where: { $and: [ { id: { $in: ids } }, where ] },
	} )

	return new Set( within.map( ( entry ) => entry.id ) )
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
