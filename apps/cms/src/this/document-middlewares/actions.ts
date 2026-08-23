
/**
 |
 | The two actions a middleware in this directory ever acts on, and the shapes
 | they arrive in.
 |
 | Eleven document-service actions exist. `create` and `update` are the two that
 | carry a `data` payload and the two that produce a document to reconcile
 | against, which is what every middleware here needs — so they are named
 | together rather than spelled out at each call site. `delete` is a write too,
 | and `publish`, `unpublish` and `discardDraft` only ever fire on a content type
 | with draft and publish on; none of the four is of any interest here.
 |
 */

const CREATE_AND_UPDATE = new Set( [ "create", "update" ] )

/** Is this a create or an update of the content type named? */
export function is_create_or_update ( context, uid?: string ) {
	if ( uid !== undefined && context.uid !== uid ) {
		return false
	}

	return CREATE_AND_UPDATE.has( context.action )
}

/**
 |
 | What the caller is writing, if anything.
 |
 | Verbatim caller input — nothing normalises `params` between the caller and
 | here — and mutable: a middleware that amends a write does it by writing into
 | this object before `next()`, so the amendment lands in the same statement and
 | the same transaction as the rest of the entry.
 |
 */
export function incoming_data (
	context,
): Record<string, unknown> | undefined {
	return context.params?.data as Record<string, unknown> | undefined
}
