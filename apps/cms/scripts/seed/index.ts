
/**
 |
 | Wipes the database and rebuilds it from scratch.
 |
 |     pnpm --filter app.cms seed
 |     pnpm --filter app.cms seed -y
 |
 | The content tree is deeply nested and every schema change invalidates the
 | shape of it, so this will be run constantly. That is the reason it rebuilds
 | rather than reconciles: reconciliation is a second model of the content, kept
 | in step by hand, and it goes wrong quietly.
 |
 | Which is also why it is only ever right against an empty database. It says
 | what it is about to delete and asks before it deletes any of it, and the
 | answer has to be typed — see `confirmation.ts`. `-y` answers in advance, for
 | a script, or for the fifth run of the afternoon.
 |
 | It refuses outright — as an exit, not a prompt — when the database client is
 | not SQLite and when the environment is production. See `guards.ts`.
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
import {
	CMS_DIR,
	database_file,
	delete_database,
	delete_uploads,
	refuse_in_production,
	refuse_unless_sqlite,
	uploads_directory,
} from "./guards.ts"

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
	refuse_unless_sqlite()
	refuse_in_production()

	console.log( disclaimer( database_file(), uploads_directory() ) )

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

	delete_database()
	delete_uploads()

	const strapi = await boot()

	try {
		await write_seed_content( strapi )
		console.log( "\nSeeded.\n" )
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
