
/**
 |
 | The CMS test seam: a real Strapi, against a freshly seeded SQLite database,
 | driven over HTTP.
 |
 | This is the seam the spec asks for, and it is the convention for every later
 | ticket. A good test here goes through a boundary a real caller uses and says
 | nothing about how the thing behind it is built, because the failure this
 | project actually has is **content silently vanishing** — below a populate
 | depth, past a publish that dropped a relation, under a middleware that
 | recomputed the wrong set. None of those are visible to a unit test of any one
 | function, and all of them are obvious in a response body.
 |
 | The one exception, `boot-fixture-cms.ts`, exists because boot-time behaviour
 | cannot be observed over HTTP: a refused boot serves nothing.
 |
 | Each file that uses this pays one boot, and one boot is tens of seconds.
 | Vitest runs the CMS files one at a time (`fileParallelism: false`), because
 | Strapi keeps global state and two live instances collide.
 |
 */

import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

import { write_seed_content } from "../../scripts/seed/content.ts"

/**
 |
 | Strapi ships a broken ES module build — extensionless directory imports that
 | Node's ESM loader refuses. Requiring the package pins the working CommonJS
 | half.
 |
 */
const { compileStrapi, createStrapi } = createRequire( import.meta.url )(
	"@strapi/strapi",
)

const CMS_DIR = path.resolve( import.meta.dirname, "..", ".." )

export type Seeded_Cms = {
	/** Absolute base URL of the running instance, e.g. `http://127.0.0.1:53211`. */
	url: string
	strapi: any
	destroy: () => Promise<void>
	/** `GET`s a path and hands back the status and the parsed body. */
	get: ( path: string ) => Promise<{ status: number; body: any }>
}

export async function boot_seeded_cms (): Promise<Seeded_Cms> {
	require_dotenv()

	// A database of its own, so a test run neither reads nor destroys whatever
	// the developer has in `.tmp/data.db`. The path is relative to the CMS
	// directory because that is how `config/database.ts` resolves it.
	const database = `.tmp/test-${process.pid}-${counter()}.db`
	const database_path = path.join( CMS_DIR, database )

	remove_database( database_path )
	fs.mkdirSync( path.dirname( database_path ), { recursive: true } )

	process.env.DATABASE_CLIENT = "sqlite"
	process.env.DATABASE_FILENAME = database
	// Port zero: the operating system picks a free one, so a developer running
	// the CMS on 1337 can run the tests at the same time.
	process.env.PORT = "0"

	const context = await compileStrapi( { appDir: CMS_DIR } )
	const strapi = await createStrapi( context ).load()

	await write_seed_content( strapi )
	await strapi.listen()

	const { port } = strapi.server.httpServer.address()
	const url = `http://127.0.0.1:${port}`

	return {
		async destroy () {
			await with_process_listeners_preserved( () => strapi.destroy() )
				.catch( () => {} )
			remove_database( database_path )
		},
		async get ( path: string ) {
			const response = await fetch( `${url}${path}` )
			const text = await response.text()

			return {
				body: text ? JSON.parse( text ) : null,
				status: response.status,
			}
		},
		strapi,
		url,
	}
}

let boots = 0

function counter () {
	boots += 1
	return boots
}

function require_dotenv () {
	if ( fs.existsSync( path.join( CMS_DIR, ".env" ) ) ) {
		return
	}

	throw new Error(
		`apps/cms/.env is missing, so Strapi has no application keys and cannot `
			+ `boot. Run "node scripts/ensure-local-env.js" from the repository `
			+ `root, which copies each app's .env.example across without ever `
			+ `overwriting.`,
	)
}

function remove_database ( file: string ) {
	for ( const suffix of [ "", "-shm", "-wal" ] ) {
		fs.rmSync( `${file}${suffix}`, { force: true } )
	}
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
