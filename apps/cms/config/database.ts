
import path from "path"

import { database_client } from "../src/this/environment"

/**
 |
 | Database connection.
 |
 | This discriminates on `DATABASE_CLIENT` and **throws** on an unknown value.
 | Falling through to a default would silently point a misconfigured deployment
 | at a local SQLite file, which is exactly the failure the seed script's own
 | client check exists to prevent.
 |
 | Unset is not an unknown value. It resolves to Postgres in production and
 | SQLite elsewhere — and either can be asked for anywhere, because pointing a
 | production-mode instance at SQLite on purpose, to reproduce a fault against a
 | copy of the data, is a thing somebody needs to be able to do.
 |
 | That resolution lives in src/this/environment.ts rather than here, so that
 | the seed's guard cannot come to disagree with it about what unset means.
 |
 | SQLite and Postgres. Nothing else is supported.
 |
 */

export default function ( { env } ) {
	const client = database_client()

	return {
		connection: {
			client,
			...get_connection( client, env ),
			acquireConnectionTimeout: env.int(
				"DATABASE_CONNECTION_TIMEOUT",
				60000,
			),
		},
	}
}

function get_connection ( client: string, env ) {
	switch ( client ) {
		case "sqlite":
			return {
				connection: {
					filename: path.join(
						__dirname,
						"..",
						"..",
						env( "DATABASE_FILENAME", ".tmp/data.db" ),
					),
				},
				useNullAsDefault: true,
			}

		case "postgres":
			return {
				connection: {
					connectionString: env( "DATABASE_URL" ),
					host: env( "DATABASE_HOST", "localhost" ),
					port: env.int( "DATABASE_PORT", 5432 ),
					database: env( "DATABASE_NAME", "strapi" ),
					user: env( "DATABASE_USERNAME", "strapi" ),
					password: env( "DATABASE_PASSWORD", "strapi" ),
					ssl: env.bool( "DATABASE_SSL", false ) && {
						key: env( "DATABASE_SSL_KEY", undefined ),
						cert: env( "DATABASE_SSL_CERT", undefined ),
						ca: env( "DATABASE_SSL_CA", undefined ),
						capath: env( "DATABASE_SSL_CAPATH", undefined ),
						cipher: env( "DATABASE_SSL_CIPHER", undefined ),
						rejectUnauthorized: env.bool(
							"DATABASE_SSL_REJECT_UNAUTHORIZED",
							true,
						),
					},
					schema: env( "DATABASE_SCHEMA", "public" ),
				},
				pool: {
					min: env.int( "DATABASE_POOL_MIN", 2 ),
					max: env.int( "DATABASE_POOL_MAX", 10 ),
				},
			}

		default:
			throw new Error(
				`Unsupported DATABASE_CLIENT "${client}". This application supports `
					+ `"sqlite" (development) and "postgres" (production), and refuses to `
					+ `fall back to a default.`,
			)
	}
}
