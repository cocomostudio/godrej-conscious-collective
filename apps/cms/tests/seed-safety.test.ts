
/**
 |
 | What stops the seed running when nobody asked it to, and what it takes with
 | it when it does run. Neither needs a Strapi instance, so neither boots one.
 |
 | The seed deletes a database and empties a directory. Every other test in this
 | suite is about content being right; these two are about a person still having
 | their content at all, which is why they are worth the file.
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

import {
	consent_from,
	disclaimer,
} from "../scripts/seed/confirmation.ts"
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

describe( "consent", () => {
	it( "is given by -y", () => {
		expect( consent_from( [ "-y" ], true ) ).toBe( "given" )
	} )

	it( "is given by --yes", () => {
		expect( consent_from( [ "--yes" ], true ) ).toBe( "given" )
	} )

	// The flag is the whole point of the flag: it is how a script that has no
	// terminal says it meant this, so it has to be read before the terminal is
	// looked for.
	it( "is given by -y even with no terminal", () => {
		expect( consent_from( [ "-y" ], false ) ).toBe( "given" )
	} )

	it( "must be asked for when a terminal is there and no flag is", () => {
		expect( consent_from( [], true ) ).toBe( "must_be_asked" )
	} )

	// A question nobody can hear is not a yes. Without a terminal there is
	// nothing to type into, so the seed has to stop rather than prompt into a
	// stream that will either answer nothing or never answer at all.
	it( "cannot be asked for without a terminal", () => {
		expect( consent_from( [], false ) ).toBe( "cannot_be_asked" )
	} )

	it( "is not given by some other flag", () => {
		expect( consent_from( [ "--force" ], true ) ).toBe( "must_be_asked" )
	} )
} )

describe( "the disclaimer", () => {
	const text = disclaimer(
		"/somewhere/.tmp/data.db",
		"/somewhere/public/uploads",
	)

	// Both are named because both are deleted, and a person deciding whether to
	// answer yes is deciding about the two of them.
	it( "names the database file it deletes", () => {
		expect( text ).toContain( "/somewhere/.tmp/data.db" )
	} )

	it( "names the uploads directory it empties", () => {
		expect( text ).toContain( "/somewhere/public/uploads" )
	} )
} )

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
