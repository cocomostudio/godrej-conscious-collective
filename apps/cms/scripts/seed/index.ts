
/**
 |
 | Wipes the database and rebuilds it from scratch.
 |
 |     pnpm --filter app.cms seed
 |     pnpm --filter app.cms seed -y
 |     ENV_PATH=.env.postgres pnpm --filter app.cms seed
 |
 | The content tree is deeply nested and every schema change invalidates the
 | shape of it, so this will be run constantly. That is the reason it rebuilds
 | rather than reconciles: reconciliation is a second model of the content, kept
 | in step by hand, and it goes wrong quietly.
 |
 | Which is also why it is only ever right against an empty database. It says
 | what it is about to delete — the resolved database, the resolved media store,
 | and the `.env` it read them from — and asks before it deletes any of it, and
 | the answer has to be typed. See `confirmation.ts`. `-y` answers in advance,
 | for a script, or for the fifth run of the afternoon.
 |
 | SQLite and Postgres, local files and S3. There is no environment it declines
 | to run in: the disclaimer names the target instead. See `guards.ts` for what
 | that replaced and why.
 |
 | ─── THE ORDER, WHICH IS THE WHOLE OF THIS FILE ─────────────────────────────
 |
 | Everything below follows from one fact: **the file rows are the only list of
 | what is in the bucket.** Drop the tables first and every S3 object is
 | orphaned beyond recovery, because nothing left knows their keys. So an
 | S3-backed library is emptied through a booted application first, and only
 | then is the database dropped.
 |
 | A local library costs none of that — the directory is the store, and
 | `delete_uploads` empties it — so the common case, a developer on SQLite,
 | still boots Strapi exactly once.
 |
 */

import { createRequire } from "node:module"

import {
	answered_yes,
	consent_from,
	disclaimer,
	refuse_without_a_terminal,
} from "./confirmation.ts"
import { write_seed_content } from "./content.ts"
import { wipe_database } from "./database.ts"
import { load_environment_file } from "./environment-file.ts"
import { CMS_DIR, delete_uploads, refuse } from "./guards.ts"
import { clear_media_library } from "./media-library.ts"
import { write_report } from "./report.ts"
import { type Target, resolve_target } from "./target.ts"

/**
 |
 | Strapi ships a broken ES module build — `@strapi/core/dist/index.mjs` carries
 | extensionless directory imports that Node's ESM loader refuses outright.
 | Requiring the package pins the working CommonJS half.
 |
 */
const { compileStrapi, createStrapi } = createRequire( import.meta.url )(
	"@strapi/strapi",
)

await main()

async function main () {
	// First, and before anything reads an environment variable. The guards and
	// the Strapi this boots have to be looking at the same one — see
	// `environment-file.ts` for what happened when they were not.
	const environment_file = load_environment_file()
	const target = resolve_target()

	console.log( disclaimer( target, environment_file ) )

	const consent = consent_from(
		process.argv.slice( 2 ),
		Boolean( process.stdin.isTTY ),
	)

	if ( consent === "cannot_be_asked" ) {
		refuse_without_a_terminal()
	}

	if ( consent === "must_be_asked" && !await answered_yes() ) {
		console.log( "\nNothing was changed.\n" )
		return
	}

	await clear_media( target )

	console.log( `Emptying the database — ${await wipe_database( target )}.` )

	const strapi = await boot()

	try {
		await write_seed_content( strapi )
		console.log( "\nSeeded.\n" )
	} finally {
		await strapi.destroy()
	}

	write_report( `Seeded ${target.database}.` )
}

/**
 |
 | Emptying the media library, by whichever of the two routes reaches it.
 |
 | The booted route is the expensive one and is taken only when it is the only
 | one there is. It runs against the database as it stands, before the drop,
 | because that is where the list lives.
 |
 */
async function clear_media ( target: Target ) {
	if ( target.media.clearable_from_disk ) {
		delete_uploads()
		console.log( `Emptied ${target.media.where}.` )
		return
	}

	console.log(
		`\nClearing the media library through Strapi, because ${target.media.where} `
			+ `can only be reached by the upload plugin. This needs the database `
			+ `as it stands, so it happens before anything is dropped.\n`,
	)

	const strapi = await boot_or_refuse(
		`The application would not boot against the database as it stands, so `
			+ `the media library could not be read.\n\n  Nothing has been `
			+ `changed. Had the seed carried on and dropped the tables, every `
			+ `object in ${target.media.where} would have been orphaned with `
			+ `nothing left naming it.`,
	)

	try {
		const { removed, stranded } = await clear_media_library( strapi )

		console.log(
			`Removed ${removed} files from the media library`
				+ ( stranded > 0
					? `, ${stranded} of which left their stored copy behind — `
						+ `the report at the end says which.`
					: "." ),
		)
	} finally {
		await strapi.destroy()
	}
}

/**
 |
 | `compileStrapi` builds the TypeScript into `dist` and hands back the app
 | context pointing at it, which is the same path `strapi develop` takes. The
 | application then boots without listening: the seed writes through the
 | document service and needs no HTTP.
 |
 */
async function boot () {
	const context = await compileStrapi( { appDir: CMS_DIR } )
	return await createStrapi( context ).load()
}

async function boot_or_refuse ( reason: string ) {
	try {
		return await boot()
	} catch ( error ) {
		refuse(
			`${reason}\n\n  ${
				error instanceof Error ? error.message : String( error )
			}`,
		)
	}
}
