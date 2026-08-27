
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

import { DIRECTORY_PLACEHOLDER, uploads_directory } from "../../scripts/seed/guards.ts"
import type { Strapi } from "../../scripts/seed/lib/strapi.ts"

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

/**
 |
 | ─── THE UPLOADS THE SUITE LEAVES BEHIND ────────────────────────────────────
 |
 | The seed writes media as files rather than rows, and Strapi's local provider
 | puts them in `public/uploads` — the same directory a developer's own database
 | points at, because the provider resolves it from the application and it
 | cannot be moved. So a run cannot empty that directory when it is finished: it
 | would take the media out from under whatever is in `.tmp`.
 |
 | It cannot decide by *time* either, which is the trap. Listing the directory
 | before the seed and deleting whatever appeared looks equivalent and is not:
 | `pnpm seed` empties this same directory and refills it over the couple of
 | minutes that follow, so a suite starting anywhere inside that window records
 | an empty directory and then deletes the developer's entire freshly-seeded
 | media library on the way out. That is not a rare interleaving — it is running
 | the seed and the tests at the same time, which is a Tuesday.
 |
 | So the run deletes by **record** instead. Once the seed has written, the file
 | rows in the template database name every file it created, variants included;
 | those exact names are what teardown removes, and nothing else is looked at.
 | A file this run did not write cannot appear in that list, whatever else is
 | happening in the directory and whenever it happens.
 |
 | A hard kill still takes the teardown with it and leaves that run's files
 | behind, which is no worse than not doing this at all.
 |
 */
export async function uploads_written_to ( strapi: Strapi ) {
	const files = await strapi.db.query( "plugin::upload.file" ).findMany()
	const names: string[] = []

	for ( const file of files ) {
		const formats = Object.values( file.formats ?? {} ) as { url?: string }[]

		for ( const url of [ file.url, ...formats.map( ( f ) => f?.url ) ] ) {
			if ( typeof url === "string" ) {
				names.push( path.basename( url ) )
			}
		}
	}

	return names
}

/**
 |
 | The names come out of a database column, so they are treated as untrusted
 | input rather than as paths: anything that is not a bare filename is dropped
 | rather than resolved, and `.gitkeep` is never removed whoever asks.
 |
 | Removal is recursive so that a name which somehow resolves to a directory is
 | removed rather than throwing `EISDIR` — a throw here would abandon every name
 | after it in the list, turning one odd entry into a whole run's worth of leak.
 |
 | The directory is a parameter so the tests can point it somewhere harmless.
 |
 */
export function remove_uploads (
	names: string[],
	directory = uploads_directory(),
) {
	for ( const name of names ) {
		if ( name === DIRECTORY_PLACEHOLDER || path.basename( name ) !== name ) {
			continue
		}

		fs.rmSync( path.join( directory, name ), {
			force: true,
			recursive: true,
		} )
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
