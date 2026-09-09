
/**
 |
 | Where the seed's destruction is bounded, and the one deletion it can make
 | without an application to help.
 |
 | The seed deletes the database before it rebuilds it. That is its whole
 | design — schema iteration is cheap only when a rebuild is one command — and
 | for a long time the bound on it was the client: SQLite and nothing else,
 | refused as an exit rather than a warning.
 |
 | That bound is gone, because the seed is now the thing that populates
 | production. What replaces it is not a smaller wall but a different one: the
 | run resolves its target, prints it — host, database, schema, and where the
 | media actually lives — and asks. See `target.ts` and `confirmation.ts`. The
 | thing being destroyed is named, rather than being assumed from an
 | environment.
 |
 | This keeps its shape from `src/this/environment.ts`, which argues that an
 | environment is a bag of defaults and that nothing should branch on it. The
 | seed used to be that file's stated exception. It no longer needs to be.
 |
 */

import fs from "node:fs"
import path from "node:path"

export const CMS_DIR = path.resolve( import.meta.dirname, "..", ".." )

/**
 |
 | Where the media library keeps its files, when it keeps them here.
 |
 | Not configurable, and not for want of trying: Strapi's local upload provider
 | resolves this from `strapi.dirs.static.public` itself and ignores the
 | `directory` handed to it in `config/plugins.ts`. Everything that boots this
 | application writes here — the seed, the admin, and the test suite.
 |
 | An instance configured for S3 has no such directory, and emptying this one
 | would tell it nothing. See `media-library.ts`.
 |
 */
export function uploads_directory () {
	return path.join( CMS_DIR, "public", "uploads" )
}

/** The one file in the uploads directory that is committed. */
export const DIRECTORY_PLACEHOLDER = ".gitkeep"

/**
 |
 | Empties the uploads directory, which is as much of the last run's output as
 | the rows were.
 |
 | The provider gives every stored file a random suffix, so nothing is ever
 | overwritten and a rerun never reuses a name. Deleting the database on its own
 | therefore leaves every file the last run wrote sitting on disk with nothing
 | left pointing at it, and a directory that only ever grows — a few thousand
 | files, in an afternoon of schema iteration.
 |
 | `.gitkeep` stays: it is the reason a clone has the directory at all.
 |
 | The directory is a parameter so the tests can point it somewhere harmless.
 |
 */
export function delete_uploads ( directory = uploads_directory() ) {
	fs.mkdirSync( directory, { recursive: true } )

	for ( const entry of fs.readdirSync( directory ) ) {
		if ( entry === DIRECTORY_PLACEHOLDER ) {
			continue
		}

		fs.rmSync( path.join( directory, entry ), {
			force: true,
			recursive: true,
		} )
	}
}

/**
 |
 | One wording and one exit for every refusal in the seed, wherever it is
 | decided — `confirmation.ts`, `target.ts` and `database.ts` all refuse
 | through this, so a person who has hit one of these has hit all of them.
 |
 */
export function refuse ( reason: string ): never {
	console.error( `\nThe seed refuses to run.\n\n${reason}\n` )
	process.exit( 1 )
}
