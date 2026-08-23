
/**
 |
 | The one call the website makes for page content.
 |
 | `.server.ts` so that it never reaches the browser bundle even if something
 | other than a loader comes to import it — the CMS's origin is a server-side
 | concern and a route module's imports are only stripped while the import is
 | reachable from server-only exports alone.
 |
 */

import type { Envelope } from "./envelope.ts"

import { Environment } from "#infra/server/environment/index.ts"

export type Fetched =
	| { found: true; envelope: Envelope }
	| { found: false }

/**
 |
 | `status` is passed straight through. It is what drives the admin's Entry
 | Preview, which renders the website in an iframe against unpublished content.
 |
 */
export async function fetch_envelope (
	path: string,
	{ status }: { status?: string | null } = {},
): Promise<Fetched> {
	const url = new URL( "/api/envelope", Environment.get( "CMS_URL" ) )
	url.searchParams.set( "path", path )

	if ( status ) {
		url.searchParams.set( "status", status )
	}

	const response = await fetch( url )

	if ( response.status === 404 ) {
		return { found: false }
	}

	if ( !response.ok ) {
		throw new Error(
			`The CMS answered ${response.status} for ${path}.`,
		)
	}

	const { data } = await response.json() as { data: Envelope }

	return { envelope: data, found: true }
}
