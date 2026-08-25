
/**
 |
 | Run once, before any test file: compile the application, and seed one
 | database that every test file then copies.
 |
 | Both of those used to happen inside `boot_seeded_cms`, which is to say once
 | per test file. Neither is per-file work:
 |
 |   • **The compile is identical every time.** `compileStrapi` runs the
 |     TypeScript build over the whole application and hands back nothing but
 |     `{ appDir, distDir }`. Eight test files ran that eight times, for the
 |     same `dist`. It runs here instead, and the files boot straight against
 |     what it built.
 |
 |   • **The seeded content is identical every time.** Every file wants the
 |     same rows, and the seed is the most expensive thing in the suite — the
 |     programme alone is fifty-five sessions, each with a page of sample
 |     content behind it. It is written once, into a template database, and
 |     each file starts from a copy of the file rather than from a rerun of
 |     the writes.
 |
 | What is *not* shared is the running instance. Strapi keeps global state, so
 | each test file still boots one of its own against its own copy of the
 | database — which is also why `fileParallelism` stays off. This removes the
 | repeated work, not the isolation.
 |
 | The template is deliberately a file rather than a fixture in memory. Vitest
 | runs each test file in a forked process, so nothing in this one's heap
 | reaches them; a database on disk does.
 |
 */

import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

import { write_seed_content } from "../../scripts/seed/content.ts"
import {
	CMS_DIR,
	destroy_strapi,
	remove_database,
	require_dotenv,
	TEMPLATE_DATABASE,
} from "./strapi-lifecycle.ts"

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

const template_path = path.join( CMS_DIR, TEMPLATE_DATABASE )

export async function setup () {
	require_dotenv()

	remove_database( template_path )
	fs.mkdirSync( path.dirname( template_path ), { recursive: true } )

	process.env.DATABASE_CLIENT = "sqlite"
	process.env.DATABASE_FILENAME = TEMPLATE_DATABASE
	process.env.PORT = "0"

	const context = await compileStrapi( { appDir: CMS_DIR } )
	const strapi = await createStrapi( context ).load()

	try {
		// **No downloads.** The registration form's slideshow is the one part
		// of the seed that leaves the machine, and nothing in this suite looks
		// at those pictures. See `Seed_Options`.
		await write_seed_content( strapi, { download_media: false } )
	} finally {
		// Destroyed rather than left listening: what the test files want is
		// the database this wrote, and a second live instance is the one thing
		// Strapi will not tolerate.
		await destroy_strapi( strapi )
	}
}

export async function teardown () {
	remove_database( template_path )
}
