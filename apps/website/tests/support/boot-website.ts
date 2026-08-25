
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
	/**
	 |
	 | Every Lead the registration relay tried to create, in order, with the
	 | token it presented. The relay is the only thing on this side that writes
	 | to the CMS, and what it sends — the consent wording in particular — is
	 | the interesting half of the form flow.
	 |
	 */
	leads: { body: any; authorization: string | null }[]
	/** Set to make the CMS refuse the next create, as a failing relay would. */
	refuse_leads: boolean
}

export type Website = {
	url: string
	cms: Cms_Stub
	stop: () => Promise<void>
	get: (
		path: string,
		options?: { redirect?: RequestRedirect },
	) => Promise<{ status: number; html: string; headers: Headers }>
	/**
	 |
	 | A JSON request, with an address of the caller's choosing.
	 |
	 | The address travels in `X-Forwarded-For`, which the server believes only
	 | because the test environment sets `TRUST_PROXY` — the same way a
	 | deployment behind a reverse proxy sets it. Without it every request from
	 | this test process would be the same visitor, and the registration form's
	 | rate limiter would refuse the fourth test rather than the sixth
	 | submission.
	 |
	 */
	json: (
		path: string,
		options?: {
			method?: string
			body?: unknown
			address?: string
		},
	) => Promise<{ status: number; body: any; headers: Headers }>
}

export async function boot_website (
	envelopes: Record<string, Envelope> = {},
): Promise<Website> {
	process.env.CMS_URL = CMS_ORIGIN

	const cms: Cms_Stub = {
		envelopes,
		leads: [],
		refuse_leads: false,
		requests: [],
	}
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

		// The one write the website makes. Everything else on this origin is
		// the envelope route, keyed by path below.
		if ( url.pathname === "/api/leads" ) {
			const authorization = new Headers( init?.headers ).get(
				"authorization",
			)

			cms.leads.push( {
				authorization,
				body: JSON.parse( String( init?.body ?? "{}" ) ),
			} )

			if ( cms.refuse_leads ) {
				return new Response( "refused", { status: 400 } )
			}

			return Response.json(
				{ data: { documentId: `lead-${cms.leads.length}` } },
				{ status: 201 },
			)
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
		async json ( path, { address, body, method = "POST" } = {} ) {
			const response = await real_fetch( `${url}${path}`, {
				body: body === undefined
					? undefined
					: JSON.stringify( body ),
				headers: {
					"content-type": "application/json",
					...( address ? { "x-forwarded-for": address } : {} ),
				},
				method,
			} )

			const text = await response.text()

			return {
				body: text ? JSON.parse( text ) : null,
				headers: response.headers,
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
