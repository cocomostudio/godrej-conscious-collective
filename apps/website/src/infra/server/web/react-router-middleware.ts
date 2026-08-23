
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

const app = express()

app.use(
	createRequestHandler( {
		build: () => import( "virtual:react-router/server-build" ),
		// ↑ `build` is a factory called by the handler on every request in
		// 	development, so the latest build is always used after an HMR update.
		// 	`virtual:react-router/server-build` is a Vite virtual module; the
		// 	build replaces it with a real file on disk for production.
		getLoadContext () {
			// React Router 8 always enables middleware, so the load context must
			// be a `RouterContextProvider`; returning a plain object is no longer
			// supported. It carries nothing yet — request-scoped values are set
			// on it with `context.set( createContext(), … )` when a loader needs
			// one.
			return new RouterContextProvider()
		},
	} ),
)

export { app }
