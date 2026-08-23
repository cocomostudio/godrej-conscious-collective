
/**
 |
 | "Exactly one row carries this flag."
 |
 | Two content types state that invariant — an Event's `main` and a Page
 | Shell's `default` — and they state it the same way, so it is written once.
 |
 | It runs **after** the write. Demotion is a reconciliation of other rows with
 | the row that was just written, and a middleware cannot see what the write
 | actually stored until the write has happened: `context.params` is verbatim
 | caller input, so a `main` arriving as the string `"true"`, or not arriving at
 | all on a save that leaves it alone, would both have to be second-guessed.
 | Reading the flag back afterwards asks the database what is true instead.
 |
 | Both queries are `strapi.db.query`, not `strapi.documents`. A document-service
 | call from inside a middleware re-enters the whole chain from the start, and
 | there is no recursion guard in the 5.52.1 source — this middleware demoting a
 | row would re-enter this middleware.
 |
 */

import type { Core, UID } from "@strapi/strapi"

import { is_create_or_update } from "./actions"

export function exclusive_flag (
	{ flag, strapi, uid }: {
		flag: string
		strapi: Core.Strapi
		uid: UID.ContentType
	},
) {
	return async function demote_the_others ( context, next ) {
		if ( !is_create_or_update( context, uid ) ) {
			return await next()
		}

		const result = await next()
		const document_id = ( result as { documentId?: string } )?.documentId

		if ( !document_id ) {
			return result
		}

		const query = strapi.db.query( uid )

		const flagged = await query.findMany( {
			select: [ "id", "documentId" ],
			where: { [flag]: true },
		} ) as { id: number; documentId: string }[]

		const promoted = flagged.find( ( row ) =>
			row.documentId === document_id
		)

		if ( !promoted ) {
			return result
		}

		const demoted = flagged
			.filter( ( row ) => row.id !== promoted.id )
			.map( ( row ) => row.id )

		if ( demoted.length === 0 ) {
			return result
		}

		await query.updateMany( {
			data: { [flag]: false },
			where: { id: { $in: demoted } },
		} )

		return result
	}
}
