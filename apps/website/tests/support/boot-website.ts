
/**
 |
 | The website test seam: the real Express server, over HTTP, with the CMS
 | stubbed at the fetch boundary.
 |
 | The boundary is `fetch`, and nothing nearer. Everything between the request
 | and the response is the thing under test — path resolution, the loader, root
 | assembly, the block registry, the renderer and the markup — and none of it is
 | reached around. The CMS is the only thing replaced, because the CMS has a
 | seam of its own where its behaviour is asserted.
 |
 | This is the convention for every later ticket, together with the CMS's seam.
 |
 */

import type { Server } from "node:http"
import type { AddressInfo } from "node:net"

import type { Envelope } from "../../src/web/cms/envelope.ts"

import { WebServer } from "../../src/infra/server/web/index.ts"

const CMS_ORIGIN = "http://cms.test"

export type Cms_Stub = {
	/**
	 |
	 | What the CMS answers, keyed by path. A path that is absent answers 404,
	 | exactly as the envelope route does for a path resolving to nothing.
	 |
	 */
	envelopes: Record<string, Envelope>
	/** Every path asked for, in order, so a caller can count the requests. */
	requests: string[]
}

export type Website = {
	url: string
	cms: Cms_Stub
	stop: () => Promise<void>
	get: (
		path: string,
		options?: { redirect?: RequestRedirect },
	) => Promise<{ status: number; html: string; headers: Headers }>
}

export async function boot_website (
	envelopes: Record<string, Envelope> = {},
): Promise<Website> {
	process.env.CMS_URL = CMS_ORIGIN

	const cms: Cms_Stub = { envelopes, requests: [] }
	const real_fetch = globalThis.fetch

	globalThis.fetch = ( async ( input: any, init?: any ) => {
		const url = new URL(
			typeof input === "string" || input instanceof URL
				? input.toString()
				: input.url,
		)

		if ( url.origin !== CMS_ORIGIN ) {
			return await real_fetch( input, init )
		}

		const path = url.searchParams.get( "path" ) ?? ""
		const status = url.searchParams.get( "status" ) ?? "published"

		cms.requests.push( `${path}?status=${status}` )

		const envelope = cms.envelopes[path]

		if ( !envelope ) {
			return new Response( null, { status: 404 } )
		}

		return Response.json( { data: envelope, meta: {} } )
	} ) as typeof fetch

	const express_app = await WebServer.build()
	const server: Server = await new Promise( ( resolve ) => {
		const listening = express_app.listen( 0, () => resolve( listening ) )
	} )

	const { port } = server.address() as AddressInfo
	const url = `http://127.0.0.1:${port}`

	return {
		cms,
		async get ( path, { redirect = "manual" } = {} ) {
			const response = await real_fetch( `${url}${path}`, { redirect } )

			return {
				headers: response.headers,
				html: await response.text(),
				status: response.status,
			}
		},
		async stop () {
			globalThis.fetch = real_fetch
			await new Promise( ( resolve ) => server.close( resolve ) )
		},
		url,
	}
}
