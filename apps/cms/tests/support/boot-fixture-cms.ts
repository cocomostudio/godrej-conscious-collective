
import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"

import strapi_app from "../../src/index"

/**
 |
 | Boots a real Strapi instance over a throwaway application built in a
 | temporary directory, and runs **this application's own bootstrap** against
 | it.
 |
 | The CMS test seam drives HTTP against the real application. This one is the
 | exception the spec names: boot-time behaviour cannot be observed over HTTP,
 | because a refused boot serves nothing. So the seam here is `load()`, which
 | runs Strapi's register and bootstrap phases and rejects when the user
 | bootstrap throws. In `strapi start` that same rejection reaches
 | `stopWithError`, which exits the process.
 |
 | The schemas are written as plain JSON and the fixture is pointed at as both
 | the application directory and the dist directory, so nothing has to be
 | compiled first. The fixture's `src/index.js` cannot import TypeScript — it is
 | `require`d by Strapi's own loader rather than by the test runner — so it
 | reaches for the bootstrap through a global that this module sets.
 |
 */

/**
 |
 | Strapi ships both a CommonJS and an ES module build, and the ES module build
 | is broken: it carries extensionless directory imports that Node's ESM loader
 | refuses. Requiring the package pins the working half.
 |
 */
const { createStrapi } = createRequire( import.meta.url )( "@strapi/strapi" )

const BOOTSTRAP_HANDLE = "__gcc_fixture_bootstrap__"

type Fixture_Cms = {
	strapi: any
	destroy: () => Promise<void>
}

type Fixture_Schemas = {
	/** Keyed by singular API name, e.g. `thing` for `api::thing.thing`. */
	content_types?: Record<string, unknown>
	/** Keyed by full component uid, e.g. `sections.hero`. */
	components?: Record<string, unknown>
}

export async function boot_fixture_cms (
	schemas: Fixture_Schemas = {},
): Promise<Fixture_Cms> {
	const app_dir = write_fixture_app( schemas )
	;( globalThis as any )[BOOTSTRAP_HANDLE] = ( strapi: any ) =>
		strapi_app.bootstrap( { strapi } )

	const strapi = createStrapi( { appDir: app_dir, distDir: app_dir } )

	const destroy = async () => {
		delete ( globalThis as any )[BOOTSTRAP_HANDLE]
		await with_process_listeners_preserved( () => strapi.destroy() )
			.catch( () => {} )
		fs.rmSync( app_dir, { force: true, recursive: true } )
	}

	try {
		await strapi.load()
	} catch ( error ) {
		await destroy()
		throw error
	}

	return { destroy, strapi }
}

function write_fixture_app ( schemas: Fixture_Schemas ) {
	const app_dir = fs.mkdtempSync(
		path.join( os.tmpdir(), "gcc-cms-fixture-" ),
	)

	write(
		app_dir,
		"package.json",
		JSON.stringify( {
			dependencies: {},
			name: "gcc-cms-fixture",
			strapi: { telemetryDisabled: true },
			version: "0.0.0",
		} ),
	)

	write(
		app_dir,
		"config/server.js",
		`module.exports = () => ( {\n`
			+ `\tapp: { keys: [ "fixture-key-one", "fixture-key-two" ] },\n`
			+ `\thost: "127.0.0.1",\n`
			+ `\tport: 0,\n`
			+ `} )\n`,
	)

	write(
		app_dir,
		"config/admin.js",
		`module.exports = () => ( {\n`
			+ `\tapiToken: { salt: "fixture-api-token-salt" },\n`
			+ `\tauth: { secret: "fixture-admin-jwt-secret" },\n`
			+ `\tsecrets: { encryptionKey: "fixture-encryption-key-0123456789" },\n`
			+ `\ttransfer: { token: { salt: "fixture-transfer-token-salt" } },\n`
			+ `} )\n`,
	)

	write(
		app_dir,
		"config/database.js",
		`const path = require( "node:path" )\n\n`
			+ `module.exports = () => ( {\n`
			+ `\tconnection: {\n`
			+ `\t\tclient: "sqlite",\n`
			+ `\t\tconnection: { filename: path.join( __dirname, "..", "database.db" ) },\n`
			+ `\t\tuseNullAsDefault: true,\n`
			+ `\t},\n`
			+ `} )\n`,
	)

	write(
		app_dir,
		"src/index.js",
		`module.exports = {\n`
			+ `\tregister () {},\n`
			+ `\tbootstrap ( { strapi } ) {\n`
			+ `\t\treturn globalThis[ "${BOOTSTRAP_HANDLE}" ]( strapi )\n`
			+ `\t},\n`
			+ `}\n`,
	)

	write( app_dir, "public/uploads/.gitkeep", "" )
	write( app_dir, "favicon.png", "" )

	for (
		const [ name, schema ] of Object.entries( schemas.content_types ?? {} )
	) {
		write(
			app_dir,
			`src/api/${name}/content-types/${name}/schema.json`,
			JSON.stringify( schema, null, "\t" ),
		)
	}

	for (
		const [ uid, schema ] of Object.entries( schemas.components ?? {} )
	) {
		const [ category, name ] = uid.split( "." )
		write(
			app_dir,
			`src/components/${category}/${name}.json`,
			JSON.stringify( schema, null, "\t" ),
		)
	}

	return app_dir
}

function write ( app_dir: string, relative_path: string, contents: string ) {
	const file = path.join( app_dir, relative_path )
	fs.mkdirSync( path.dirname( file ), { recursive: true } )
	fs.writeFileSync( file, contents )
}

/**
 |
 | `strapi.destroy()` ends with a bare `process.removeAllListeners()`, which
 | takes the test runner's own IPC listeners with it and leaves the worker
 | looking as though it crashed. The listeners are captured before and put back
 | after.
 |
 */
async function with_process_listeners_preserved ( run: () => Promise<unknown> ) {
	const captured = process.eventNames().map( ( event ) => ( {
		event,
		listeners: process.rawListeners( event ),
	} ) )

	try {
		await run()
	} finally {
		for ( const { event, listeners } of captured ) {
			for ( const listener of listeners ) {
				if ( !process.rawListeners( event ).includes( listener ) ) {
					process.on(
						event,
						listener as ( ...args: any[] ) => void,
					)
				}
			}
		}
	}
}
