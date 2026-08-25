
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
 | Each file that uses this pays one boot. It no longer pays a compile or a
 | seed: `global-setup.ts` does both once for the whole run, and this copies
 | the database it left. Vitest runs the CMS files one at a time
 | (`fileParallelism: false`), because Strapi keeps global state and two live
 | instances collide.
 |
 */

import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

import {
	CMS_DIR,
	copy_database,
	destroy_strapi,
	DIST_DIR,
	remove_database,
	TEMPLATE_DATABASE,
} from "./strapi-lifecycle.ts"

/**
 |
 | Strapi ships a broken ES module build — extensionless directory imports that
 | Node's ESM loader refuses. Requiring the package pins the working CommonJS
 | half.
 |
 */
const { createStrapi } = createRequire( import.meta.url )( "@strapi/strapi" )

export type Seeded_Cms = {
	/** Absolute base URL of the running instance, e.g. `http://127.0.0.1:53211`. */
	url: string
	strapi: any
	destroy: () => Promise<void>
	/** `GET`s a path and hands back the status and the parsed body. */
	get: ( path: string ) => Promise<{ status: number; body: any }>
}

export async function boot_seeded_cms (): Promise<Seeded_Cms> {
	// A database of its own, so a test run neither reads nor destroys whatever
	// the developer has in `.tmp/data.db`. The path is relative to the CMS
	// directory because that is how `config/database.ts` resolves it.
	const database = `.tmp/test-${process.pid}-${counter()}.db`
	const database_path = path.join( CMS_DIR, database )

	remove_database( database_path )
	fs.mkdirSync( path.dirname( database_path ), { recursive: true } )
	copy_database( seeded_template(), database_path )

	process.env.DATABASE_CLIENT = "sqlite"
	process.env.DATABASE_FILENAME = database
	// Port zero: the operating system picks a free one, so a developer running
	// the CMS on 1337 can run the tests at the same time.
	process.env.PORT = "0"

	// `compileStrapi` is not called here. It returns nothing but
	// `{ appDir, distDir }`, and the global setup has already run it — so this
	// names the same two directories and skips a repeat of the build.
	const strapi = await createStrapi( {
		appDir: CMS_DIR,
		distDir: DIST_DIR,
	} ).load()

	await strapi.listen()

	const { port } = strapi.server.httpServer.address()
	const url = `http://127.0.0.1:${port}`

	return {
		async destroy () {
			await destroy_strapi( strapi )
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

/**
 |
 | The seeded database the global setup left, or a refusal naming the reason
 | there isn't one.
 |
 | The failure this guards against is a test file run without the global setup
 | — through an editor's test runner, say. Booting anyway would give an empty
 | database and a wall of assertions failing on missing content, which reads as
 | the seed being broken rather than as never having run.
 |
 */
function seeded_template () {
	const template = path.join( CMS_DIR, TEMPLATE_DATABASE )

	if ( !fs.existsSync( template ) ) {
		throw new Error(
			`${TEMPLATE_DATABASE} is missing, so there is no seeded database to `
				+ `copy. It is written by tests/support/global-setup.ts, which `
				+ `vitest runs once per "vitest run" — so this is a test booted `
				+ `outside the suite's own runner.`,
		)
	}

	return template
}

let boots = 0

function counter () {
	boots += 1
	return boots
}
