
/**
 |
 | What the seed takes with it when it runs, and what a test run takes with it
 | when it finishes. Neither needs a Strapi instance, so neither boots one.
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
import { remove_uploads } from "./support/strapi-lifecycle.ts"

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

describe( "removing the uploads a test run wrote", () => {
	it( "removes the files it is named", () => {
		const directory = a_directory_holding( "ours.pdf", "also_ours.pdf" )

		remove_uploads( [ "ours.pdf", "also_ours.pdf" ], directory )

		expect( fs.readdirSync( directory ) ).toEqual( [] )
	} )

	// The whole point. This directory is shared with whatever database the
	// developer has in `.tmp`, and with any seed running beside this one, so
	// anything this run did not write is never this run's to delete — however
	// new it looks.
	it( "leaves everything it is not named", () => {
		const directory = a_directory_holding(
			".gitkeep",
			"theirs.jpg",
			"ours.pdf",
		)

		remove_uploads( [ "ours.pdf" ], directory )

		expect( fs.readdirSync( directory ).sort() ).toEqual(
			[ ".gitkeep", "theirs.jpg" ],
		)
	} )

	it( "does not mind a file that has already gone", () => {
		const directory = a_directory_holding( ".gitkeep" )

		expect( () => remove_uploads( [ "gone.pdf" ], directory ) )
			.not.toThrow()

		expect( fs.readdirSync( directory ) ).toEqual( [ ".gitkeep" ] )
	} )

	// The names come from a database column, so they are treated as untrusted
	// input rather than as paths: nothing that could climb out of the directory
	// is ever handed to `rm`.
	it( "ignores a name that is a path rather than a name", () => {
		const directory = a_directory_holding( ".gitkeep" )
		const sibling = path.join( directory, "..", "sibling.txt" )
		fs.writeFileSync( sibling, "x" )

		remove_uploads( [ "../sibling.txt", "nested/one.pdf" ], directory )

		expect( fs.existsSync( sibling ) ).toBe( true )
	} )

	it( "does not remove .gitkeep even if asked to", () => {
		const directory = a_directory_holding( ".gitkeep" )

		remove_uploads( [ ".gitkeep" ], directory )

		expect( fs.readdirSync( directory ) ).toEqual( [ ".gitkeep" ] )
	} )

	it( "does not mind the directory having gone", () => {
		expect( () => remove_uploads( [ "ours.pdf" ], "/nowhere" ) )
			.not.toThrow()
	} )
} )
