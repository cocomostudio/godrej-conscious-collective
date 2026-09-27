
import { Readable } from "node:stream"

import type { Core } from "@strapi/strapi"

import { instants_of } from "./calendar"
import { columns_of } from "./columns"
import { BYTE_ORDER_MARK, csv_line } from "./csv"
import type { Access, Where } from "./permissions"
import type { Export_Request } from "./request"

const BATCH_SIZE = 500

/** How many rows the export will write. Only rows the admin can read count. */
export async function count_rows (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
	access: Access,
): Promise<number> {
	const count = await strapi.db.query( request.uid as any ).count( {
		where: await where_of( strapi, request, timezone, access ),
	} )

	return Math.min( count, limit_of( request ) )
}

/**
 |
 | The CSV, as a stream that reads the database one batch at a time and only
 | when the connection has taken the batch before.
 |
 | Rows come newest first. Each batch starts after the last row of the batch
 | before, by creation time and then by ID, so that no row is skipped or
 | repeated the way offset paging can.
 |
 | Only the rows the admin can read are written. A field the admin can read
 | on only some of those rows is left empty on the others.
 |
 */
export function csv_stream (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
	access: Access,
): Readable {
	return Readable.from( csv_chunks( strapi, request, timezone, access ), {
		objectMode: false,
	} )
}

async function* csv_chunks (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
	access: Access,
) {
	const columns = await columns_of( strapi, request, timezone, access )
	const select = columns.filter( ( column ) => !column.populate )
		.map( ( column ) => column.name )
	const populate = Object.fromEntries(
		columns.filter( ( column ) => column.populate )
			.map( ( column ) => [ column.name, column.populate ] ),
	)

	yield BYTE_ORDER_MARK + csv_line( columns.map( ( column ) => column.label ) )

	const where = await where_of( strapi, request, timezone, access )
	let remaining = limit_of( request )
	let last: { id: number; createdAt: unknown } | undefined

	while ( remaining > 0 ) {
		const rows = await strapi.db.query( request.uid as any ).findMany( {
			limit: Math.min( BATCH_SIZE, remaining ),
			orderBy: [ { createdAt: "desc" }, { id: "desc" } ],
			populate,
			select: [ "id", ...select ],
			where: last ? { $and: [ where, after( last ) ] } : where,
		} )

		if ( rows.length === 0 ) {
			return
		}

		for ( const column of columns ) {
			await column.prepare?.( rows )
		}

		yield rows.map( ( row ) =>
			csv_line( columns.map( ( column ) => column.cell( row ) ) )
		).join( "" )

		remaining -= rows.length
		last = rows[rows.length - 1]
	}
}

/**
 |
 | The rows the export reads: the selection's, in the status's version,
 | narrowed to the readable.
 |
 */
async function where_of (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
	access: Access,
): Promise<Where> {
	const readable = await access.readable_rows( request.uid )
	const version = version_of( strapi, request )

	if ( request.selection.kind === "latest" ) {
		return { $and: [ readable, version ] }
	}

	const { from, until } = instants_of( request.selection.days, timezone )

	return {
		$and: [ readable, version, { createdAt: { $gte: from, $lt: until } } ],
	}
}

/** The version of each entry the status reads. */
function version_of ( strapi: Core.Strapi, request: Export_Request ): Where {
	switch ( request.status ) {
		case undefined:
			return {}
		case "published":
			return { publishedAt: { $notNull: true } }
		case "all":
			return { publishedAt: null }
		case "draft":
			return {
				documentId: {
					$notIn: published_document_ids( strapi, request.uid ),
				},
				publishedAt: null,
			}
	}
}

/**
 |
 | A subquery answering the document ID of every published entry. It is
 | written in knex, because the query engine takes a knex query as the value
 | of `$notIn`, but has no subquery of its own.
 |
 */
function published_document_ids ( strapi: Core.Strapi, uid: string ) {
	const { attributes, tableName } = strapi.db.metadata.get( uid )
	const column = ( name: string ) => ( attributes[name] as any ).columnName

	return strapi.db.connection( tableName )
		.select( column( "documentId" ) )
		.whereNotNull( column( "publishedAt" ) )
}

function limit_of ( request: Export_Request ) {
	return request.selection.kind === "latest"
		? request.selection.count
		: Number.POSITIVE_INFINITY
}

/** Every row that comes after `last` in newest-first order. */
function after ( last: { id: number; createdAt: unknown } ) {
	return {
		$or: [
			{ createdAt: { $lt: last.createdAt } },
			{ createdAt: last.createdAt, id: { $lt: last.id } },
		],
	}
}
