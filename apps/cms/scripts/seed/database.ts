
/**
 |
 | Emptying the database, which is a different operation per client.
 |
 | SQLite is a file, so the file goes. Postgres is a schema this deployment does
 | not own the server of — the RDS role can drop what is in the schema and
 | cannot drop the database around it — so **the tables go and the database
 | stays**. Both leave Strapi with nothing, which is the only thing the rest of
 | the seed needs: `compileStrapi` rebuilds the schema from the models on the
 | next boot, whichever client it is talking to.
 |
 | Both run before Strapi is booted. That is deliberate for the SQLite arm,
 | where a file cannot be unlinked out from under an open connection without
 | surprising it, and it is what keeps the Postgres arm from costing a second
 | boot: the drop is plain DDL and needs a connection, not an application.
 |
 | The price is that the connection has to be built twice — once here and once
 | by `config/database.ts` — and the note on `target.ts` is where that is
 | argued.
 |
 */

import fs from "node:fs"
import path from "node:path"

import { refuse } from "./guards.ts"

import type { Postgres_Target, Target } from "./target.ts"

export async function wipe_database ( target: Target ) {
	if ( target.client === "sqlite" ) {
		return delete_sqlite_file( target.file! )
	}

	return await drop_postgres_tables( target.postgres! )
}

/**
 |
 | Deletes the database file and the two sidecars SQLite leaves beside it in
 | write-ahead-logging mode.
 |
 */
function delete_sqlite_file ( file: string ) {
	for ( const suffix of [ "", "-shm", "-wal" ] ) {
		fs.rmSync( `${file}${suffix}`, { force: true } )
	}

	fs.mkdirSync( path.dirname( file ), { recursive: true } )

	return `deleted ${file}`
}

/**
 |
 | Drops every table in the schema, then every sequence the tables did not take
 | with them.
 |
 | `cascade` is what makes one statement enough: Strapi's tables reference each
 | other through link tables, so any order that dropped them one at a time would
 | have to be a topological sort of foreign keys that changes whenever a schema
 | does. Dropping them together, with cascade, is the same result without the
 | ordering.
 |
 | Sequences are swept afterwards rather than assumed gone. A sequence owned by
 | a serial or identity column is dropped with its table; one left behind by a
 | column that stopped being serial is not, and it would collide with the name
 | Strapi wants on the rebuild.
 |
 | Nothing else in the schema is touched. Strapi creates tables and sequences
 | and nothing else, so anything else in there was put there by somebody, and a
 | seed that dropped it would be destroying something it never wrote.
 |
 */
async function drop_postgres_tables ( target: Postgres_Target ) {
	const { Client } = await import_pg()
	const client = new Client( target.connection )

	try {
		await client.connect()
	} catch ( error ) {
		refuse(
			`The database would not accept a connection.\n\n  ${
				message( error )
			}\n\n`
				+ `Nothing has been changed. Check the DATABASE_ variables in the `
				+ `.env this run is reading, and that the server is reachable from `
				+ `here.`,
		)
	}

	try {
		const tables = await names_in(
			client,
			"select tablename as name from pg_tables where schemaname = $1",
			target.schema,
		)

		if ( tables.length > 0 ) {
			await client.query(
				`drop table ${qualified( target.schema, tables )} cascade`,
			)
		}

		const sequences = await names_in(
			client,
			"select sequencename as name from pg_sequences where schemaname = $1",
			target.schema,
		)

		if ( sequences.length > 0 ) {
			await client.query(
				`drop sequence ${
					qualified( target.schema, sequences )
				} cascade`,
			)
		}

		return `dropped ${tables.length} tables and ${sequences.length} `
			+ `sequences from schema ${target.schema}`
	} catch ( error ) {
		refuse(
			`The tables could not be dropped.\n\n  ${message( error )}\n\n`
				+ `The database may now be half-emptied. The role needs owner `
				+ `rights on the tables in schema "${target.schema}" — dropping `
				+ `them is not something a read-write grant allows.`,
		)
	} finally {
		await client.end().catch( () => {} )
	}
}

async function names_in ( client: any, query: string, schema: string ) {
	const { rows } = await client.query( query, [ schema ] )
	return rows.map( ( row: { name: string } ) => row.name )
}

/**
 |
 | Identifiers come from `pg_tables`, so they are the server's own words for
 | them rather than anything a person typed — but they are still identifiers
 | being pasted into DDL, and `pg` has no placeholder for those. Quoting them,
 | and doubling any quote inside, is what keeps a table someone named oddly from
 | being a syntax error or worse.
 |
 | Exported for the tests. It is the only string in this file that is built
 | rather than sent, and it is built into a `drop table`.
 |
 */
export function qualified ( schema: string, names: string[] ) {
	return names
		.map( ( name ) => `${quoted( schema )}.${quoted( name )}` )
		.join( ", " )
}

function quoted ( identifier: string ) {
	return `"${identifier.replace( /"/g, "\"\"" )}"`
}

function message ( error: unknown ) {
	return error instanceof Error ? error.message : String( error )
}

/**
 |
 | `pg` is a CommonJS package and a dependency of this application because
 | Strapi's Postgres client is built on it. Importing it dynamically keeps it
 | out of the SQLite path, where it is never needed.
 |
 */
async function import_pg (): Promise<{ Client: any }> {
	const module = await import( "pg" )
	return ( module as any ).default ?? module
}
