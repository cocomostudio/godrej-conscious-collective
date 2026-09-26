
import { Readable } from "node:stream"

import type { Core } from "@strapi/strapi"

import { instants_of } from "./calendar"
import { columns_of } from "./columns"
import { BYTE_ORDER_MARK, csv_line } from "./csv"
import type { Export_Request } from "./request"

const BATCH_SIZE = 500

/** How many rows the export will write. */
export async function count_rows (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
): Promise<number> {
	const count = await strapi.db.query( request.uid as any ).count( {
		where: where_of( request, timezone ),
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
 */
export function csv_stream (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
): Readable {
	return Readable.from( csv_chunks( strapi, request, timezone ), {
		objectMode: false,
	} )
}

async function* csv_chunks (
	strapi: Core.Strapi,
	request: Export_Request,
	timezone: string,
) {
	const columns = await columns_of( strapi, request, timezone )
	const select = columns.filter( ( column ) => !column.populate )
		.map( ( column ) => column.name )
	const populate = Object.fromEntries(
		columns.filter( ( column ) => column.populate )
			.map( ( column ) => [ column.name, column.populate ] ),
	)

	yield BYTE_ORDER_MARK + csv_line( columns.map( ( column ) => column.label ) )

	const where = where_of( request, timezone )
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

		yield rows.map( ( row ) =>
			csv_line( columns.map( ( column ) => column.cell( row ) ) )
		).join( "" )

		remaining -= rows.length
		last = rows[rows.length - 1]
	}
}

function where_of ( request: Export_Request, timezone: string ) {
	if ( request.selection.kind === "latest" ) {
		return {}
	}

	const { from, until } = instants_of( request.selection.days, timezone )

	return { createdAt: { $gte: from, $lt: until } }
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
