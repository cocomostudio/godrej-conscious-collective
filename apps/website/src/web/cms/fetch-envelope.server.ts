
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

import type { Answer } from "./request.server.ts"

import { answered_well, cms_url, request_from_cms } from "./request.server.ts"

import { Environment } from "#infra/server/environment/index.ts"

export type Fetched =
	| { found: true; envelope: Envelope }
	| { found: false }

/**
 |
 | Where a picture the CMS stores is served from.
 |
 | Strapi's own upload provider writes a relative path, so the browser has to be
 | told the origin to put in front of it — and the browser cannot read
 | server-side configuration. It travels in the loader's data instead, which is
 | why the question is answered here, in the one module that already knows the
 | CMS exists and is guaranteed never to reach the browser bundle.
 |
 | `CMS_PUBLIC_URL` rather than `CMS_URL`, and the distinction is the whole
 | point: `CMS_URL` is where **this process** dials the CMS, which on a machine
 | running both is a loopback port no visitor can resolve. This value ends up in
 | an `src` attribute in someone else's browser, so it has to be an address that
 | browser can reach.
 |
 */
export function media_origin () {
	return Environment.get( "CMS_PUBLIC_URL" )
}

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
	const url = cms_url( "/api/envelope" )
	url.searchParams.set( "path", path )

	if ( status ) {
		url.searchParams.set( "status", status )
	}

	const response = await request_from_cms( url )

	if ( response.status === 404 ) {
		return { found: false }
	}

	if ( !answered_well( response ) ) {
		throw new Error(
			`The CMS answered ${response.status} for ${path}.`,
		)
	}

	return { envelope: read_envelope( response, path ), found: true }
}

/**
 |
 | A body that does not parse is reported with the beginning of what did
 | arrive, because the likeliest cause of one is that the request reached the
 | wrong application — a `Host` naming something else on the machine, answering
 | perfectly well with a page of HTML. The first line of it says which.
 |
 */
function read_envelope ( response: Answer, path: string ): Envelope {
	try {
		return ( JSON.parse( response.body ) as { data: Envelope } ).data
	}
	catch {
		throw new Error(
			`The CMS answered ${response.status} for ${path} with a body that `
				+ `is not JSON: ${response.body.slice( 0, 200 )}`,
		)
	}
}
