
/**
 |
 | The two refusals, which are what make `index.ts` safe to run.
 |
 | The seed deletes the database before it rebuilds it. That is its whole
 | design — schema iteration is cheap only when a rebuild is one command — and
 | it means the difference between a developer's own machine and anything else
 | has to be a wall rather than a warning. Both checks run before anything is
 | deleted and both exit the process. Neither prompts, because a prompt is
 | something a tired person answers wrongly at eleven at night.
 |
 */

import fs from "node:fs"
import path from "node:path"

export const CMS_DIR = path.resolve( import.meta.dirname, "..", ".." )

/**
 |
 | Refuses unless the database client is SQLite.
 |
 | Postgres is the production client. Nothing about this script inspects where
 | a Postgres connection points, so it cannot tell a colleague's laptop from the
 | real thing — which is exactly why it declines to look.
 |
 */
export function refuse_unless_sqlite () {
	const client = process.env.DATABASE_CLIENT ?? "sqlite"

	if ( client !== "sqlite" ) {
		refuse(
			`DATABASE_CLIENT is "${client}". The seed wipes the database it is `
				+ `pointed at, so it runs against local SQLite and nothing else.`,
		)
	}
}

/**
 |
 | Refuses in production, whatever the client says.
 |
 */
export function refuse_in_production () {
	const environment = process.env.NODE_ENV ?? "development"

	if ( environment === "production" ) {
		refuse(
			`NODE_ENV is "production". The seed deletes every row it can reach `
				+ `and must be unable to touch real content, not merely `
				+ `discouraged from it.`,
		)
	}
}

/**
 |
 | Where the SQLite file lives, mirroring `config/database.ts`: a path relative
 | to the CMS directory, defaulting to `.tmp/data.db`.
 |
 */
export function database_file () {
	return path.join(
		CMS_DIR,
		process.env.DATABASE_FILENAME ?? ".tmp/data.db",
	)
}

/**
 |
 | Deletes the database file and the two sidecars SQLite leaves beside it in
 | write-ahead-logging mode. Strapi rebuilds the schema from the models on the
 | next boot.
 |
 */
export function delete_database () {
	const file = database_file()

	for ( const suffix of [ "", "-shm", "-wal" ] ) {
		fs.rmSync( `${file}${suffix}`, { force: true } )
	}

	fs.mkdirSync( path.dirname( file ), { recursive: true } )

	return file
}

function refuse ( reason: string ): never {
	console.error( `\nThe seed refuses to run.\n\n${reason}\n` )
	process.exit( 1 )
}
