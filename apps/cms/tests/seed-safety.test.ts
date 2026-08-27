
/**
 |
 | What the seed takes with it when it runs. It needs no Strapi instance, so it
 | boots none.
 |
 | Every other test in this suite is about content being right. This one is
 | about a person still having their content at all, which is why it is worth
 | its own file.
 |
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import {
	describe,
	expect,
	it,
} from "vitest"

import { delete_uploads } from "../scripts/seed/guards.ts"

function a_directory_holding ( ...entries: string[] ) {
	const directory = fs.mkdtempSync(
		path.join( os.tmpdir(), "seed-uploads-test-" ),
	)

	for ( const entry of entries ) {
		fs.writeFileSync( path.join( directory, entry ), "x" )
	}

	return directory
}

describe( "deleting the uploads", () => {
	it( "removes the files", () => {
		const directory = a_directory_holding( "one.pdf", "two.jpg" )

		delete_uploads( directory )

		expect( fs.readdirSync( directory ) ).toEqual( [] )
	} )

	// The one file in there that is committed, and the reason the directory
	// survives a clone at all.
	it( "keeps .gitkeep", () => {
		const directory = a_directory_holding( ".gitkeep", "one.pdf" )

		delete_uploads( directory )

		expect( fs.readdirSync( directory ) ).toEqual( [ ".gitkeep" ] )
	} )

	it( "removes nested directories", () => {
		const directory = a_directory_holding()
		fs.mkdirSync( path.join( directory, "nested" ) )
		fs.writeFileSync( path.join( directory, "nested", "one.pdf" ), "x" )

		delete_uploads( directory )

		expect( fs.readdirSync( directory ) ).toEqual( [] )
	} )

	// A fresh clone has the directory; a clone whose owner deleted it does not,
	// and Strapi will not write into one that is not there.
	it( "creates the directory when it is missing", () => {
		const directory = path.join( a_directory_holding(), "gone" )

		delete_uploads( directory )

		expect( fs.existsSync( directory ) ).toBe( true )
	} )
} )
