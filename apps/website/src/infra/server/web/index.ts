
import type { ViteDevServer } from "vite"
import type Express from "express"

import path from "node:path"

import express from "express"

import { Environment } from "#infra/server/environment/index.ts"

function build_express_server () {
	return express()
}

function configure_express_server ( express_app: Express.Application ) {
	express_app.disable( "x-powered-by" )
	// ↑ remove the custom X-Powered-By header
}

async function build_vite_server () {
	return await import( "vite" ).then( ( vite ) =>
		// ↑ Dynamic import, so this whole branch is skipped in production.
		vite.createServer( {
			server: { middlewareMode: true },
			// ↑ Tells Vite not to create its own HTTP server. It exposes a
			// 	`.middlewares` property instead, which plugs into Express.
		} )
	)
}

function register_vite_middleware (
	express_app: Express.Application,
	vite_dev_server: ViteDevServer,
) {
	express_app.use( vite_dev_server.middlewares )
}

function register_react_router_middleware (
	express_app: Express.Application,
	vite_dev_server: ViteDevServer,
) {
	express_app.use( async ( request, response, next ) => {
		try {
			const middleware_path = path.join(
				import.meta.dirname,
				"react-router-middleware.ts",
			)
			const source = await vite_dev_server.ssrLoadModule(
				middleware_path,
			)
			// ↑ Vite's SSR-aware module loader, called on every request so that
			// 	changes are reflected without restarting the server.
			return await source.app( request, response, next )
		}
		catch ( error ) {
			if ( error instanceof Error ) {
				vite_dev_server.ssrFixStacktrace( error )
				// ↑ Remaps the stack trace back to the TypeScript source.
			}
			next( error )
		}
	} )
}

async function register_static_middleware ( express_app: Express.Application ) {
	const server_build_dir = path.resolve(
		Environment.get( "SERVER_BUILD_DIR" ),
	)
	const client_build_dir = path.resolve(
		Environment.get( "CLIENT_BUILD_DIR" ),
	)

	express_app.use(
		"/assets",
		express.static( `${client_build_dir}/assets`, {
			immutable: true,
			maxAge: "1y",
		} ),
	)
	express_app.use( express.static( client_build_dir, { maxAge: "1h" } ) )
	express_app.use(
		await import( `${server_build_dir}/index.js` ).then( ( mod ) =>
			mod.app
		),
	)
}

function start_listening ( express_app: Express.Application ) {
	const port = Environment.get( "HTTP_SERVER_PORT" )

	const server = express_app.listen( port, () => {
		console.log(
			`HTTP server is up and running on http://localhost:${port}`,
		)
	} )

	for ( const signal of [ "SIGTERM", "SIGINT" ] ) {
		process.once( signal, () => {
			server.close()
		} )
	}
}

export const WebServer = {
	/**
	 |
	 | The configured Express application, not yet listening.
	 |
	 | Separate from `init` so that the tests can drive the real server over
	 | HTTP on a port of the operating system's choosing, rather than
	 | reassembling a second one that would then be the thing under test.
	 |
	 */
	async build () {
		const express_app = build_express_server()
		configure_express_server( express_app )

		if ( Environment.is_development() ) {
			const vite_dev_server = await build_vite_server()
			register_vite_middleware( express_app, vite_dev_server )
			register_react_router_middleware( express_app, vite_dev_server )
		}
		else {
			await register_static_middleware( express_app )
		}

		return express_app
	},

	async init () {
		start_listening( await WebServer.build() )
	},
}
