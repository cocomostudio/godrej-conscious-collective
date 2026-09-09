
/**
 |
 | What this run is pointed at, resolved once and printed before anything is
 | destroyed.
 |
 | The seed used to be able to name its target in one line, because there was
 | only ever one: a SQLite file at a known path. Now it can be a Postgres schema
 | on a host somebody has never typed the name of, and the media can be a bucket
 | rather than a directory. A person deciding whether to answer yes is deciding
 | about *those*, so they have to be resolved and shown rather than summarised.
 |
 | **The connection built here must stay identical to the one in
 | `config/database.ts`.** The seed drops tables through it and Strapi rebuilds
 | them through that one, so a difference between the two is a wipe of one
 | database and a reseed of another. They cannot share a function: that file is
 | a Strapi config module taking Strapi's `env` helper, and this runs before
 | Strapi exists. What they do share is `src/this/environment.ts`, which decides
 | the one thing a default could differ on.
 |
 */

import path from "node:path"

import {
	type Upload_Provider,
	configured,
	configured_flag,
	database_client,
	upload_provider,
} from "../../src/this/environment.ts"
import { CMS_DIR, refuse, uploads_directory } from "./guards.ts"

export type Target = {
	client: string
	/** Where the rows are, in the words a person would use to find them. */
	database: string
	media: Media_Target
	/** The SQLite file, when that is what this is. */
	file?: string
	/** What the Postgres arm needs to connect and to drop. */
	postgres?: Postgres_Target
}

export type Media_Target = {
	provider: Upload_Provider
	/** Where the files are, in the words a person would use to find them. */
	where: string
	/**
	 |
	 | Whether the media can be cleared without Strapi.
	 |
	 | A directory can: emptying it removes the files and nothing else knows
	 | about them. A bucket cannot — the only thing that deletes an S3 object
	 | is the upload plugin, which needs a booted application. See
	 | `media-library.ts`.
	 |
	 */
	clearable_from_disk: boolean
}

export type Postgres_Target = {
	schema: string
	connection: Record<string, unknown>
}

/**
 |
 | Call this after `load_environment_file`, and only after.
 |
 */
export function resolve_target (): Target {
	const client = database_client()
	const media = resolve_media_target()

	switch ( client ) {
		case "sqlite": {
			const file = sqlite_file()

			return { client, database: file, file, media }
		}

		case "postgres": {
			const postgres = postgres_target()

			return {
				client,
				database: describe_postgres( postgres ),
				media,
				postgres,
			}
		}

		default:
			refuse(
				`DATABASE_CLIENT is "${client}", which is neither "sqlite" nor `
					+ `"postgres". Those are the two this application supports, `
					+ `and the seed will not guess at a third.`,
			)
	}
}

function resolve_media_target (): Media_Target {
	const provider = upload_provider()

	if ( provider === "local" ) {
		return {
			provider,
			where: uploads_directory(),
			clearable_from_disk: true,
		}
	}

	const bucket = configured( "AWS_BUCKET_NAME" )
		?? "(AWS_BUCKET_NAME is not set)"
	const region = configured( "AWS_REGION" ) ?? "(AWS_REGION is not set)"

	return {
		provider,
		where: `the S3 bucket ${bucket} in ${region}`,
		clearable_from_disk: false,
	}
}

/**
 |
 | Mirrors the SQLite arm of `config/database.ts`.
 |
 */
function sqlite_file () {
	return path.join(
		CMS_DIR,
		configured( "DATABASE_FILENAME" ) ?? ".tmp/data.db",
	)
}

/**
 |
 | The same object `config/database.ts` hands knex, so that the drop and the
 | rebuild cannot land on different databases.
 |
 */
function postgres_target (): Postgres_Target {
	const ssl = configured_flag( "DATABASE_SSL", false )

	return {
		schema: configured( "DATABASE_SCHEMA" ) ?? "public",
		connection: {
			connectionString: configured( "DATABASE_URL" ),
			host: configured( "DATABASE_HOST" ) ?? "localhost",
			port: Number( configured( "DATABASE_PORT" ) ?? 5432 ),
			database: configured( "DATABASE_NAME" ) ?? "strapi",
			user: configured( "DATABASE_USERNAME" ) ?? "strapi",
			password: configured( "DATABASE_PASSWORD" ) ?? "strapi",
			ssl: ssl && {
				rejectUnauthorized: configured_flag(
					"DATABASE_SSL_REJECT_UNAUTHORIZED",
					true,
				),
			},
		},
	}
}

/**
 |
 | What to print, which is not the same as what to connect with.
 |
 | `pg` parses `connectionString` and lets it win over the keys beside it, so a
 | disclaimer that read `DATABASE_HOST` while the connection came from
 | `DATABASE_URL` would name a host nothing was about to touch. When the URL is
 | there, the URL is what gets described.
 |
 */
function describe_postgres ( { connection, schema }: Postgres_Target ) {
	const url = connection.connectionString as string | undefined

	if ( url !== undefined ) {
		try {
			const parsed = new URL( url )

			return `${parsed.hostname}:${parsed.port || "5432"}`
				+ `${parsed.pathname} (schema ${schema}, from DATABASE_URL)`
		} catch {
			return `DATABASE_URL, which is not a url this can parse (schema ${schema})`
		}
	}

	return `${connection.host}:${connection.port}/${connection.database} `
		+ `(schema ${schema}, as ${connection.user})`
}
