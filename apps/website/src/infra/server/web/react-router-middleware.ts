
/**
 |
 | The React Router request handler, mounted on its own Express instance.
 |
 | Loaded through Vite in development and built into `build/server/index.js` in
 | production — it is the SSR build's entry point (see vite.config.ts).
 |
 */

import { RouterContextProvider } from "react-router"
import { createRequestHandler } from "@react-router/express"
import express from "express"

import {
	CLIENT_ADDRESS,
	UNKNOWN_ADDRESS,
} from "./client-address.ts"

import { Environment } from "#infra/server/environment/index.ts"

const app = express()

// Set here as well as on the outer server, because `req.ip` is resolved
// against the setting of the app the request is being handled by — and that is
// this one. False unless a deployment says otherwise; see the note on
// `TRUST_PROXY` in the environment module for why that default is not a
// preference.
app.set( "trust proxy", Environment.get( "TRUST_PROXY" ) )

app.use(
	createRequestHandler( {
		build: () => import( "virtual:react-router/server-build" ),
		// ↑ `build` is a factory called by the handler on every request in
		// 	development, so the latest build is always used after an HMR update.
		// 	`virtual:react-router/server-build` is a Vite virtual module; the
		// 	build replaces it with a real file on disk for production.
		getLoadContext ( request ) {
			// React Router 8 always enables middleware, so the load context must
			// be a `RouterContextProvider`; returning a plain object is no longer
			// supported.
			const context = new RouterContextProvider()

			// The one request-scoped value anything here needs. A loader is
			// handed a Fetch `Request`, which has no socket and no `req.ip`, so
			// the address has to be carried across from Express — see
			// `client-address.ts` for why it is `req.ip` and not the
			// `X-Forwarded-For` header.
			context.set(
				CLIENT_ADDRESS,
				request.ip ?? request.socket?.remoteAddress
					?? UNKNOWN_ADDRESS,
			)

			return context
		},
	} ),
)

export { app }
