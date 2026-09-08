
/**
 |
 | Every request the website makes to the CMS leaves through here.
 |
 | `node:http` rather than `fetch`, for one reason: `Host` is a **forbidden
 | header name**, so `fetch` discards it without complaint and nothing about
 | the resulting request says the header was ever asked for.
 |
 | It has to be asked for because `CMS_URL` may name a machine rather than a
 | service. The CMS shares its host with other applications on a private
 | network, addressed by IP, and what stands in front of them routes on `Host`
 | — so the address dialled decides which machine answers and `CMS_HOST_NAME`
 | decides which application on it does.
 |
 | `.server.ts` because the CMS's origin is a server-side concern, and one of
 | the two callers carries the API token besides.
 |
 */

import http from "node:http"
import https from "node:https"

import { Environment } from "#infra/server/environment/index.ts"

export type Answer = { status: number; body: string }

/**
 |
 | Where **this process** dials the CMS, which is not where a browser reaches
 | it — see `CMS_PUBLIC_URL` in the environment module for the other question.
 |
 */
export function cms_url ( pathname: string ): URL {
	return new URL( pathname, Environment.get( "CMS_URL" ) )
}

/** Answered, whatever the answer. Only a connection that fails rejects. */
export function request_from_cms (
	url: URL,
	{ body, headers = {}, method = "GET" }: {
		method?: string
		body?: string
		headers?: Record<string, string>
	} = {},
): Promise<Answer> {
	const secure = url.protocol === "https:"
	const transport = secure ? https : http
	const host_name = Environment.get( "CMS_HOST_NAME" )

	return new Promise( ( resolve, reject ) => {
		const outgoing = transport.request(
			url,
			{
				headers: {
					...headers,
					...( body === undefined
						? {}
						: {
							"content-length": String(
								Buffer.byteLength( body ),
							),
						} ),
					...( host_name ? { host: host_name } : {} ),
				},
				method,
				// Over TLS the certificate is matched against the name offered
				// in the handshake rather than the address dialled, so SNI has
				// to be overridden alongside `Host` or the connection fails
				// before the header is ever read.
				...( secure && host_name ? { servername: host_name } : {} ),
			},
			( incoming ) => {
				incoming.setEncoding( "utf8" )

				let answered = ""

				incoming.on( "data", ( chunk ) => answered += chunk )
				incoming.on( "end", () => resolve( {
					body: answered,
					status: incoming.statusCode ?? 0,
				} ) )
			},
		)

		outgoing.on( "error", reject )
		outgoing.end( body )
	} )
}

/** The range `fetch` calls `ok`, since the callers all want the same question. */
export function answered_well ( { status }: Answer ): boolean {
	return status >= 200 && status <= 299
}
