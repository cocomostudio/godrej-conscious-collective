/**
 |
 | The website test seam: the real Express server, over HTTP, with the CMS
 | stubbed behind an HTTP server of its own.
 |
 | The boundary is the socket, and nothing nearer. Everything between the
 | request and the response is the thing under test — path resolution, the
 | loader, root assembly, the block registry, the renderer and the markup — and
 | none of it is reached around. The CMS is the only thing replaced, because the
 | CMS has a seam of its own where its behaviour is asserted.
 |
 | This is the convention for every later ticket, together with the CMS's seam.
 |
 */

import type { IncomingMessage, Server, ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

import type { Envelope } from "../../src/web/cms/envelope.ts"

import http from "node:http"

import { WebServer } from "../../src/infra/server/web/index.ts"

export const CMS_HOST_NAME = "cms.test"
const CMS_ORIGIN = `http://${CMS_HOST_NAME}`

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
	 | The `Host` on every request, in order.
	 |
	 | It is the only thing that says which of the applications sharing the
	 | CMS's machine a request is for, and the machine is dialled by address —
	 | so a website that stopped sending it would still reach this stub and
	 | would reach the wrong application in a deployment.
	 |
	 */
	host_names: string[]
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
	const cms: Cms_Stub = {
		envelopes,
		host_names: [],
		leads: [],
		refuse_leads: false,
		requests: [],
	}

	const cms_server = await listen_as_the_cms( cms )

	process.env.CMS_URL = origin_of( cms_server )
	/**
	 |
	 | Pinned as well, rather than left to the fallback from `CMS_URL`.
	 |
	 | The two answer different questions — where this process dials the CMS,
	 | and where a browser reaches it — and the second one is meaningful when
	 | it is **empty**: that is how a deployment behind a reverse proxy asks for
	 | uploads addressed relative to the website's own origin. Vitest loads the
	 | developer's `.env`, so a machine set up that way would hand these tests
	 | an empty origin, and every `src` a test asserts on would lose its host.
	 |
	 | So the harness names it, and the suite says the same thing on every
	 | machine.
	 |
	 */
	process.env.CMS_PUBLIC_URL = CMS_ORIGIN
	/**
	 |
	 | Named too, because a deployment names it: `CMS_URL` above is an address
	 | and says nothing about which of the applications behind it is wanted.
	 |
	 */
	process.env.CMS_HOST_NAME = CMS_HOST_NAME

	const express_app = await WebServer.build()
	const server: Server = await new Promise( ( resolve ) => {
		const listening = express_app.listen( 0, () => resolve( listening ) )
	} )

	const { port } = server.address() as AddressInfo
	const url = `http://127.0.0.1:${port}`

	return {
		cms,
		async get ( path, { redirect = "manual" } = {} ) {
			const response = await fetch( `${url}${path}`, { redirect } )

			return {
				headers: response.headers,
				html: await response.text(),
				status: response.status,
			}
		},
		async json ( path, { address, body, method = "POST" } = {} ) {
			const response = await fetch( `${url}${path}`, {
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
			await new Promise( ( resolve ) => cms_server.close( resolve ) )
			await new Promise( ( resolve ) => server.close( resolve ) )
		},
		url,
	}
}

/**
 |
 | A CMS of this website's own, on a port of its own.
 |
 | One per booted website rather than one per process, so that a test which
 | boots a second website inside a first — an empty CMS, to see what the page
 | does with nothing — gets a second CMS with it, and neither can answer for
 | the other.
 |
 */
async function listen_as_the_cms ( cms: Cms_Stub ): Promise<Server> {
	const listening = http.createServer(
		( incoming, outgoing ) => answer_as_the_cms( cms, incoming, outgoing ),
	)

	await new Promise<void>( ( resolve ) =>
		listening.listen( 0, "127.0.0.1", resolve )
	)

	return listening
}

function origin_of ( server: Server ): string {
	const { port } = server.address() as AddressInfo

	return `http://127.0.0.1:${port}`
}

async function answer_as_the_cms (
	cms: Cms_Stub,
	incoming: IncomingMessage,
	outgoing: ServerResponse,
) {
	const url = new URL( incoming.url ?? "/", CMS_ORIGIN )

	cms.host_names.push( incoming.headers.host ?? "" )

	// The one write the website makes. Everything else on this origin is the
	// envelope route, keyed by path below.
	if ( url.pathname === "/api/leads" ) {
		cms.leads.push( {
			authorization: incoming.headers.authorization ?? null,
			body: JSON.parse( await read_body( incoming ) || "{}" ),
		} )

		if ( cms.refuse_leads ) {
			return answer( outgoing, 400, "refused" )
		}

		return answer_with_json(
			outgoing,
			201,
			{ data: { documentId: `lead-${cms.leads.length}` } },
		)
	}

	const path = url.searchParams.get( "path" ) ?? ""
	const status = url.searchParams.get( "status" ) ?? "published"

	cms.requests.push( `${path}?status=${status}` )

	const envelope = cms.envelopes[path]

	if ( !envelope ) {
		return answer( outgoing, 404, "" )
	}

	return answer_with_json( outgoing, 200, { data: envelope, meta: {} } )
}

function answer ( outgoing: ServerResponse, status: number, body: string ) {
	outgoing.writeHead( status )
	outgoing.end( body )
}

function answer_with_json (
	outgoing: ServerResponse,
	status: number,
	body: unknown,
) {
	outgoing.writeHead( status, { "content-type": "application/json" } )
	outgoing.end( JSON.stringify( body ) )
}

function read_body ( incoming: IncomingMessage ): Promise<string> {
	return new Promise( ( resolve ) => {
		incoming.setEncoding( "utf8" )

		let body = ""

		incoming.on( "data", ( chunk ) => body += chunk )
		incoming.on( "end", () => resolve( body ) )
	} )
}
