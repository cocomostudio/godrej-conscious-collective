
/**
 |
 | An entry with no page shell of its own adopts the default one — on creation,
 | and whenever an editor clears the attribute.
 |
 | **`page_shell` is deliberately not marked `required`.** A required attribute
 | and a filling middleware are two mechanisms for one invariant, and they
 | fight: the admin refuses the save on the client before the document service
 | is ever reached, so the middleware never runs and the editor is told to fill
 | in a field the system was about to fill in for them.
 |
 | It amends the write before `next()`, for the same reason the colour triplets
 | do — the shell lands in the same statement as the rest of the entry.
 |
 | **If no page shell is marked default the attribute is left null**, and the
 | website renders the page without chrome. That is the same degradation as a
 | missing main event, and it is better than refusing the editor's save over
 | configuration they may not be able to see.
 |
 | It is written against "a content type with a `page_shell` attribute" rather
 | than against a list of names, because Page, Session and Contributor all carry
 | one and all three want identical behaviour.
 |
 */

import type { Core } from "@strapi/strapi"

import {
	incoming_data,
	is_create_or_update,
} from "./actions"
import { relation_emptiness } from "./relation-emptiness"

const ATTRIBUTE = "page_shell"
const PAGE_SHELL_UID = "api::page-shell.page-shell"

export function fill_page_shell_from_default ( strapi: Core.Strapi ) {
	return async function fill_then_continue ( context, next ) {
		if ( !is_create_or_update( context ) ) {
			return await next()
		}

		if ( !takes_a_page_shell( strapi, context.uid ) ) {
			return await next()
		}

		const data = incoming_data( context )

		if ( !data || !wants_filling( context.action, data ) ) {
			return await next()
		}

		const shell = await default_page_shell( strapi )

		if ( shell ) {
			data[ATTRIBUTE] = shell.documentId
		}

		return await next()
	}
}

/**
 |
 | An update and a create read the same write differently, and the difference is
 | what "unchanged" can possibly mean.
 |
 | On an **update**, an attribute nobody mentioned is unchanged, and so is one
 | whose delta says neither connect nor disconnect — refilling either would
 | overwrite an editor's own choice on every unrelated save.
 |
 | On a **create** there is nothing for "unchanged" to refer to. Anything short
 | of an actual value is an entry arriving with no page shell, and that includes
 | the `{ connect: [], disconnect: [] }` the admin sends for a relation the
 | editor left alone — which is exactly the shape a create from the admin has.
 |
 */
function wants_filling ( action: string, data: Record<string, unknown> ) {
	if ( !( ATTRIBUTE in data ) ) {
		return action === "create"
	}

	const emptiness = relation_emptiness( data[ATTRIBUTE] )

	if ( emptiness === "filled" ) {
		return false
	}

	return emptiness === "empty" || action === "create"
}

function takes_a_page_shell ( strapi: Core.Strapi, uid: string ) {
	const attribute = strapi.contentTypes[uid]?.attributes?.[ATTRIBUTE] as
		| { type?: string; target?: string }
		| undefined

	return attribute?.type === "relation"
		&& attribute.target === PAGE_SHELL_UID
}

/**
 |
 | `strapi.db.query`, not `strapi.documents`: a document-service read from
 | inside a middleware re-enters the chain from index zero, and this middleware
 | is in that chain.
 |
 */
async function default_page_shell ( strapi: Core.Strapi ) {
	return await strapi.db.query( PAGE_SHELL_UID ).findOne( {
		select: [ "documentId" ],
		where: { default: true },
	} ) as { documentId: string } | null
}
