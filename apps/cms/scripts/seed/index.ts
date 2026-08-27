
/**
 |
 | Wipes the database and rebuilds it from scratch.
 |
 |     pnpm --filter app.cms seed
 |     pnpm --filter app.cms seed --interactive
 |
 | The content tree is deeply nested and every schema change invalidates the
 | shape of it, so this will be run constantly. That is the reason it rebuilds
 | rather than reconciles: reconciliation is a second model of the content, kept
 | in step by hand, and it goes wrong quietly.
 |
 | It is **non-interactive by default**, because a prompt in a tight loop stops
 | being read after the third time. `--interactive` puts the prompt back for the
 | rare occasion somebody wants it.
 |
 | It refuses outright — as an exit, not a prompt — when the database client is
 | not SQLite and when the environment is production. See `guards.ts`.
 |
 */

import { createRequire } from "node:module"
import readline from "node:readline/promises"

import { write_seed_content } from "./content.ts"
import {
	CMS_DIR,
	database_file,
	delete_database,
	delete_uploads,
	refuse_in_production,
	refuse_unless_sqlite,
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

	const file = database_file()

	console.log(
		`\nThis deletes ${file} and everything in it, then rebuilds the `
			+ `database from the seed.\n`,
	)

	if ( process.argv.includes( "--interactive" ) && !await confirmed() ) {
		console.log( "Nothing was changed.\n" )
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

async function confirmed () {
	const prompt = readline.createInterface( {
		input: process.stdin,
		output: process.stdout,
	} )

	try {
		const answer = await prompt.question( "Type \"yes\" to continue: " )
		return answer.trim().toLowerCase() === "yes"
	} finally {
		prompt.close()
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
