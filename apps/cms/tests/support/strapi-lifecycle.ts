
/**
 |
 | What the three CMS test seams share: where the application is, how a booted
 | Strapi is put down, and the throwaway databases they run against.
 |
 | None of it is interesting on its own. It lives here because `global-setup`,
 | `boot-seeded-cms` and `boot-fixture-cms` all need some of it, and a copy of
 | `with_process_listeners_preserved` in each of the three is three chances to
 | fix the same bug twice.
 |
 */

import fs from "node:fs"
import path from "node:path"

export const CMS_DIR = path.resolve( import.meta.dirname, "..", ".." )

/**
 |
 | Where `compileStrapi` puts the built application — `outDir` in
 | `tsconfig.json`, which is what its own `resolveOutDir` reads.
 |
 | The global setup compiles once into it; every test file after that boots
 | against it and compiles nothing.
 |
 */
export const DIST_DIR = path.join( CMS_DIR, "dist" )

/**
 |
 | The seeded database the global setup leaves behind, as `config/database.ts`
 | wants it: a path relative to the CMS directory.
 |
 | Every test file copies this rather than seeding one of its own.
 |
 */
export const TEMPLATE_DATABASE = ".tmp/test-template.db"

/** The two sidecars SQLite leaves beside a database in write-ahead-logging mode. */
const SIDECARS = [ "", "-shm", "-wal" ]

export function remove_database ( file: string ) {
	for ( const suffix of SIDECARS ) {
		fs.rmSync( `${file}${suffix}`, { force: true } )
	}
}

/**
 |
 | Copies a database and whatever sidecars are beside it.
 |
 | The sidecars are copied **because they may not be there**: a clean close
 | checkpoints the write-ahead log into the database and removes them, but that
 | is a promise about a graceful shutdown rather than about every shutdown, and
 | a copy that took the database without a live log would be missing whatever
 | the log still held.
 |
 */
export function copy_database ( from: string, to: string ) {
	for ( const suffix of SIDECARS ) {
		if ( fs.existsSync( `${from}${suffix}` ) ) {
			fs.copyFileSync( `${from}${suffix}`, `${to}${suffix}` )
		}
	}
}

export function require_dotenv () {
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

/**
 |
 | Puts a booted Strapi down, and puts the process back as it found it.
 |
 | `strapi.destroy()` ends with a bare `process.removeAllListeners()`, which
 | takes the test runner's own IPC listeners with it and leaves the worker
 | looking as though it crashed. The listeners are captured before and put back
 | after. A failure to destroy is swallowed: the process is going away anyway,
 | and a throw here would be reported as the test's failure rather than as the
 | teardown's.
 |
 */
export async function destroy_strapi (
	strapi: { destroy: () => Promise<unknown> },
) {
	const captured = process.eventNames().map( ( event ) => ( {
		event,
		listeners: process.rawListeners( event ),
	} ) )

	try {
		await strapi.destroy()
	} catch {
		// Deliberately ignored — see above.
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
