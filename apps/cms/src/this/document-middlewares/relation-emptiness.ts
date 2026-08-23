
/**
 |
 | Does this incoming relation value leave the attribute empty?
 |
 | Three answers, not two, because `context.params` is **verbatim caller
 | input**: nothing normalises it between the caller and the middleware. The
 | same relation arrives as a `documentId` string, as a number, as an object
 | with an id, as an array of any of those, or as a `connect`/`disconnect`/`set`
 | delta — which is what the admin sends, on every save, for every relation on
 | the entry.
 |
 | So `{ connect: [], disconnect: [] }` — the admin's way of saying "this
 | relation is exactly as you left it" — is neither empty nor filled. It is
 | **unknown**, and the caller of this function is expected to leave such a
 | write alone rather than guess at it.
 |
 | Distinguishing these shapes by hand is the same job Strapi's own relation
 | code does, and this deliberately does less of it: it answers one question,
 | and says so when it cannot.
 |
 */

export type Emptiness = "empty" | "filled" | "unknown"

export function relation_emptiness ( value: unknown ): Emptiness {
	if ( value === null || value === undefined || value === "" ) {
		return "empty"
	}

	if ( Array.isArray( value ) ) {
		return value.length === 0 ? "empty" : "filled"
	}

	if ( typeof value !== "object" ) {
		// A `documentId` string or a numeric id.
		return "filled"
	}

	const delta = value as Record<string, unknown>

	// `set` replaces the whole relation, so it answers on its own.
	if ( "set" in delta ) {
		return length_of( delta.set ) === 0 ? "empty" : "filled"
	}

	if ( "connect" in delta || "disconnect" in delta ) {
		if ( length_of( delta.connect ) > 0 ) {
			return "filled"
		}

		// Disconnecting with nothing to connect empties a `manyToOne`.
		// Disconnecting nothing either changes nothing at all.
		return length_of( delta.disconnect ) > 0 ? "empty" : "unknown"
	}

	// A bare `{ documentId }` or `{ id }`.
	return "filled"
}

function length_of ( value: unknown ): number {
	if ( Array.isArray( value ) ) {
		return value.length
	}

	return value === null || value === undefined ? 0 : 1
}
