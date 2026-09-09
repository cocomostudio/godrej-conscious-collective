
/**
 |
 | The `.env` this run is governed by, loaded before anything reads it.
 |
 | The seed used to run as a bare `node` process that never loaded a `.env`,
 | which meant its guards read one environment and the Strapi it then booted
 | read another: `@strapi/core` calls `dotenv.config()` at module load, inside
 | `compileStrapi`. A `.env` naming Postgres and a shell naming nothing gave a
 | guard that resolved "unset, so SQLite", let the run through, deleted a
 | SQLite file nothing was using, and then seeded whatever the `.env` pointed
 | at. The wall was standing next to the door.
 |
 | So this is loaded first, before the target is resolved and before anything
 | is disclaimed. `process.loadEnvFile` uses the same precedence dotenv does —
 | **a variable already in the environment wins over the file** — so what the
 | seed resolves is what Strapi will resolve, key for key.
 |
 | `ENV_PATH` is honoured because Strapi honours it, and for the same reason it
 | is useful here: it is how a developer keeps a `.env` for their SQLite work
 | and a `.env.postgres` beside it without editing either.
 |
 |     ENV_PATH=.env.postgres pnpm --filter app.cms seed
 |
 | **`ENV_PATH` replaces `.env`; it does not layer on top of it.** Strapi reads
 | exactly one file and so does this, which means a `.env.postgres` holding only
 | the six `DATABASE_` keys boots into `App keys are required` — `APP_KEYS`,
 | the JWT secrets and the salts were all in the file it is no longer reading.
 | Every such file has to be a complete one. Layering was rejected rather than
 | overlooked: the seed would then resolve variables Strapi does not, and a
 | difference between what the disclaimer names and what the boot connects to
 | is the entire failure this module exists to prevent.
 |
 | On the production host the file to name is the one PM2 starts the CMS with —
 | `infra/production/cms-host/.env` — and not the `apps/cms/.env` this defaults
 | to. The disclaimer prints whichever was read, which is the check.
 |
 */

import fs from "node:fs"
import path from "node:path"

import { CMS_DIR } from "./guards.ts"

/**
 |
 | A relative `ENV_PATH` resolves against the CMS directory rather than the
 | cwd, so that the command above means the same thing from anywhere in the
 | workspace. Strapi resolves it against the cwd, and the two agree in the only
 | place it matters — `pnpm --filter` runs with the package as the cwd.
 |
 */
export function environment_file () {
	const configured = process.env.ENV_PATH

	if ( configured === undefined || configured === "" ) {
		return path.join( CMS_DIR, ".env" )
	}

	return path.resolve( CMS_DIR, configured )
}

/**
 |
 | Returns the file it loaded, or `null` when there was none.
 |
 | A missing `.env` is not an error. A fresh clone has none, and every variable
 | the seed reads has a default — that is what `src/this/environment.ts` is
 | for. What matters is that the answer is printed in the disclaimer, because
 | "no `.env`" and "a `.env` naming production" are the two cases a person
 | needs told apart before they type yes.
 |
 */
export function load_environment_file (): string | null {
	const file = environment_file()

	if ( !fs.existsSync( file ) ) {
		return null
	}

	process.loadEnvFile( file )

	return file
}
