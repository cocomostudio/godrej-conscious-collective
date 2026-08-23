
/**
 |
 | Give a fresh clone a working `.env` per app.
 |
 | `.env` is ignored by git and `.env.example` is not, so a clone has the shape
 | of the environment but none of the files. This copies each example across
 | once, and never overwrites an existing `.env`.
 |
 | It exists so that "clone, install, run one command" actually works. The
 | example files carry development values only; production supplies its own.
 |
 */

import { access, copyFile, readdir } from "node:fs/promises"
import { constants } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repository_root = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	"..",
)
const apps_directory = path.join( repository_root, "apps" )

const apps = await readdir( apps_directory, { withFileTypes: true } )

for ( const app of apps ) {
	if ( !app.isDirectory() ) {
		continue
	}

	const example_path = path.join( apps_directory, app.name, ".env.example" )
	const env_path = path.join( apps_directory, app.name, ".env" )

	if ( !await exists( example_path ) || await exists( env_path ) ) {
		continue
	}

	await copyFile( example_path, env_path )
	console.log( `Created apps/${app.name}/.env from its example.` )
}

async function exists ( file_path ) {
	try {
		await access( file_path, constants.F_OK )
		return true
	}
	catch {
		return false
	}
}
