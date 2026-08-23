
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vitest"

/**
 |
 | Every schema file must be valid strict JSON.
 |
 | Nothing else in the toolchain enforces this. `tsc` copies the schemas into
 | `dist` with `resolveJsonModule`, and it re-emits them rather than passing
 | them through, so a trailing comma is laundered on the way and Strapi's
 | loader — which does use a strict parse — never sees it. dprint's JSON plugin
 | is configured to maintain trailing commas rather than remove them, and its
 | configuration is not checked into this repository anyway.
 |
 | The gdl reference project carries two schema files that are not valid JSON,
 | surviving on exactly that laundering. This test is why this one will not.
 |
 */

const SRC = path.join(
	fileURLToPath( new URL( ".", import.meta.url ) ),
	"..",
	"src",
)

test("every schema file under src/ is valid strict JSON", () => {
	// There are no schema files yet, and zero files scanned is otherwise a
	// pass — so without this the test would stay green for ever if the path
	// above ever stopped resolving.
	expect( { exists: fs.existsSync( SRC ), path: SRC } ).toEqual( {
		exists: true,
		path: SRC,
	} )

	const failures = json_files_under( SRC ).flatMap( ( file ) => {
		try {
			JSON.parse( fs.readFileSync( file, "utf8" ) )
			return []
		} catch ( error ) {
			return [
				`${path.relative( SRC, file )}: ${
					( error as Error ).message
				}`,
			]
		}
	} )

	expect( failures ).toEqual( [] )
})

function json_files_under ( directory: string ): string[] {
	if ( !fs.existsSync( directory ) ) {
		return []
	}

	return fs.readdirSync( directory, { withFileTypes: true } ).flatMap(
		( entry ) => {
			const entry_path = path.join( directory, entry.name )

			if ( entry.isDirectory() ) {
				return json_files_under( entry_path )
			}

			return entry.name.endsWith( ".json" ) ? [ entry_path ] : []
		},
	)
}
