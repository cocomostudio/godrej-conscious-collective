
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
import { qualified } from "../scripts/seed/database.ts"
import { delete_uploads } from "../scripts/seed/guards.ts"
import {
	record_failure,
	recorded_failures,
	reset_failures,
} from "../scripts/seed/report.ts"
import { resolve_target } from "../scripts/seed/target.ts"
import { remove_uploads } from "./support/strapi-lifecycle.ts"

import type { Target } from "../scripts/seed/target.ts"

const A_SQLITE_TARGET: Target = {
	client: "sqlite",
	database: "/somewhere/.tmp/data.db",
	file: "/somewhere/.tmp/data.db",
	media: {
		provider: "local",
		where: "/somewhere/public/uploads",
		clearable_from_disk: true,
	},
}

const A_POSTGRES_TARGET: Target = {
	client: "postgres",
	database: "db.example.com:5433/gcc_strapi_db (schema public, as someone)",
	media: {
		provider: "aws-s3",
		where: "the S3 bucket gcc-media in ap-south-1",
		clearable_from_disk: false,
	},
	postgres: { schema: "public", connection: {} },
}

function a_directory_holding ( ...entries: string[] ) {
	const directory = fs.mkdtempSync(
		path.join( os.tmpdir(), "seed-uploads-test-" ),
	)

	for ( const entry of entries ) {
		fs.writeFileSync( path.join( directory, entry ), "x" )
	}

	return directory
}

describe("consent", () => {
	it("is given by -y", () => {
		expect( consent_from( [ "-y" ], true ) ).toBe( "given" )
	})

	it("is given by --yes", () => {
		expect( consent_from( [ "--yes" ], true ) ).toBe( "given" )
	})

	// The flag is the whole point of the flag: it is how a script that has no
	// terminal says it meant this, so it has to be read before the terminal is
	// looked for.
	it("is given by -y even with no terminal", () => {
		expect( consent_from( [ "-y" ], false ) ).toBe( "given" )
	})

	it("must be asked for when a terminal is there and no flag is", () => {
		expect( consent_from( [], true ) ).toBe( "must_be_asked" )
	})

	// A question nobody can hear is not a yes. Without a terminal there is
	// nothing to type into, so the seed has to stop rather than prompt into a
	// stream that will either answer nothing or never answer at all.
	it("cannot be asked for without a terminal", () => {
		expect( consent_from( [], false ) ).toBe( "cannot_be_asked" )
	})

	it("is not given by some other flag", () => {
		expect( consent_from( [ "--force" ], true ) ).toBe( "must_be_asked" )
	})
})

describe("the disclaimer", () => {
	const sqlite = disclaimer( A_SQLITE_TARGET, "/somewhere/.env" )
	const postgres = disclaimer(
		A_POSTGRES_TARGET,
		"/somewhere/.env.production",
	)

	// Both are named because both are cleared, and a person deciding whether to
	// answer yes is deciding about the two of them.
	it("names the database file it deletes", () => {
		expect( sqlite ).toContain( "/somewhere/.tmp/data.db" )
	})

	it("names the uploads directory it empties", () => {
		expect( sqlite ).toContain( "/somewhere/public/uploads" )
	})

	// A remote target is the case where a person cannot tell what they are
	// about to destroy from anything else on the screen.
	it("names the postgres host, database and schema", () => {
		expect( postgres ).toContain(
			"db.example.com:5433/gcc_strapi_db (schema public, as someone)",
		)
	})

	it("names the bucket when the media is not on this machine", () => {
		expect( postgres ).toContain( "the S3 bucket gcc-media in ap-south-1" )
	})

	// The distinction matters to whoever owns the server: the seed drops what
	// is in the schema and leaves the database, its owner and its grants.
	it("says the database itself survives a postgres wipe", () => {
		expect( postgres ).toContain( "the database itself stays" )
	})

	it("says the file goes for a sqlite wipe", () => {
		expect( sqlite ).toContain( "by deleting the file" )
	})

	// Which `.env` was read decides everything above it, and it is the one
	// thing not visible from the prompt.
	it("names the .env it read", () => {
		expect( postgres ).toContain( "/somewhere/.env.production" )
	})

	it("says so when there was no .env to read", () => {
		expect( disclaimer( A_SQLITE_TARGET, null ) ).toContain( "no .env" )
	})
})

describe("resolving the target", () => {
	/**
	 |
	 | Clears the variables a target is resolved from, sets the ones this case
	 | is about, and hands back the undo.
	 |
	 | It restores key by key rather than putting a saved copy back over
	 | `process.env`. Assigning to `process.env` replaces Node's live
	 | environment with an ordinary object, and anything reading the
	 | environment natively afterwards — a child process, `loadEnvFile` — is
	 | then reading something else. Vitest gives each file its own process, so
	 | the blast radius would have been this file; that is why it went
	 | unnoticed, not a reason it was alright.
	 |
	 */
	function with_environment ( variables: Record<string, string> ) {
		const touched = new Set( [
			...Object.keys( process.env ).filter( ( key ) =>
				key.startsWith( "DATABASE_" ) || key === "UPLOAD_PROVIDER"
			),
			...Object.keys( variables ),
		] )

		const saved = new Map(
			[ ...touched ].map( ( key ) =>
				[ key, process.env[key] ] as const
			),
		)

		for ( const key of touched ) {
			delete process.env[key]
		}

		Object.assign( process.env, variables )

		return () => {
			for ( const [ key, value ] of saved ) {
				if ( value === undefined ) {
					delete process.env[key]
				} else {
					process.env[key] = value
				}
			}
		}
	}

	it("is sqlite outside production, with no variables set", () => {
		const restore = with_environment( {} )

		try {
			const target = resolve_target()

			expect( target.client ).toBe( "sqlite" )
			expect( target.file ).toContain( ".tmp/data.db" )
			expect( target.media.clearable_from_disk ).toBe( true )
		} finally {
			restore()
		}
	})

	it("describes a postgres target by host, database and schema", () => {
		const restore = with_environment( {
			DATABASE_CLIENT: "postgres",
			DATABASE_HOST: "db.example.com",
			DATABASE_PORT: "5433",
			DATABASE_NAME: "gcc_strapi_db",
			DATABASE_USERNAME: "someone",
			DATABASE_SCHEMA: "public",
		} )

		try {
			expect( resolve_target().database ).toBe(
				"db.example.com:5433/gcc_strapi_db (schema public, as someone)",
			)
		} finally {
			restore()
		}
	})

	// `pg` lets a connection string win over the keys beside it, so a
	// disclaimer built from those keys would name a host nothing was about to
	// touch.
	it("describes DATABASE_URL rather than the keys it overrides", () => {
		const restore = with_environment( {
			DATABASE_CLIENT: "postgres",
			DATABASE_URL: "postgres://someone@real.example.com:6000/real_db",
			DATABASE_HOST: "ignored.example.com",
			DATABASE_NAME: "ignored_db",
		} )

		try {
			const described = resolve_target().database

			expect( described ).toContain( "real.example.com:6000/real_db" )
			expect( described ).not.toContain( "ignored" )
		} finally {
			restore()
		}
	})

	// An S3 library cannot be emptied by deleting anything on this machine,
	// and that is the fact the whole run order hangs off.
	it("knows an S3 library cannot be cleared from disk", () => {
		const restore = with_environment( {
			UPLOAD_PROVIDER: "aws-s3",
			AWS_BUCKET_NAME: "gcc-media",
			AWS_REGION: "ap-south-1",
		} )

		try {
			const { media } = resolve_target()

			expect( media.clearable_from_disk ).toBe( false )
			expect( media.where ).toContain( "gcc-media" )
		} finally {
			restore()
		}
	})
})

// The one string in the seed that is built into DDL rather than sent as a
// parameter, because postgres has no placeholder for an identifier.
describe("quoting identifiers for the drop", () => {
	it("qualifies every name with its schema", () => {
		expect( qualified( "public", [ "files", "up_users" ] ) ).toBe(
			"\"public\".\"files\", \"public\".\"up_users\"",
		)
	})

	it("doubles a quote inside a name rather than closing on it", () => {
		expect( qualified( "public", [ "od\"d" ] ) ).toBe(
			"\"public\".\"od\"\"d\"",
		)
	})
})

describe("the report of what could not be seeded", () => {
	it("keeps what it is given", () => {
		reset_failures()

		record_failure( {
			what: "A picture",
			where: "Page Shell — the Form slideshow field",
			why: "the download timed out",
			how: [
				"Download it from somewhere",
				"Upload it in Media Library",
			],
		} )

		const [ failure ] = recorded_failures()

		expect( failure.what ).toBe( "A picture" )
		expect( failure.how ).toHaveLength( 2 )

		reset_failures()
	})

	// The harness runs the seed more than once in a process, and a report
	// carrying the last run's failures would be a report about nothing.
	it("can be emptied", () => {
		record_failure( {
			what: "A picture",
			where: "somewhere",
			why: "a reason",
			how: [],
		} )

		reset_failures()

		expect( recorded_failures() ).toHaveLength( 0 )
	})
})

describe("deleting the uploads", () => {
	it("removes the files", () => {
		const directory = a_directory_holding( "one.pdf", "two.jpg" )

		delete_uploads( directory )

		expect( fs.readdirSync( directory ) ).toEqual( [] )
	})

	// The one file in there that is committed, and the reason the directory
	// survives a clone at all.
	it("keeps .gitkeep", () => {
		const directory = a_directory_holding( ".gitkeep", "one.pdf" )

		delete_uploads( directory )

		expect( fs.readdirSync( directory ) ).toEqual( [ ".gitkeep" ] )
	})

	it("removes nested directories", () => {
		const directory = a_directory_holding()
		fs.mkdirSync( path.join( directory, "nested" ) )
		fs.writeFileSync( path.join( directory, "nested", "one.pdf" ), "x" )

		delete_uploads( directory )

		expect( fs.readdirSync( directory ) ).toEqual( [] )
	})

	// A fresh clone has the directory; a clone whose owner deleted it does not,
	// and Strapi will not write into one that is not there.
	it("creates the directory when it is missing", () => {
		const directory = path.join( a_directory_holding(), "gone" )

		delete_uploads( directory )

		expect( fs.existsSync( directory ) ).toBe( true )
	})
})

describe("removing the uploads a test run wrote", () => {
	it("removes the files it is named", () => {
		const directory = a_directory_holding( "ours.pdf", "also_ours.pdf" )

		remove_uploads( [ "ours.pdf", "also_ours.pdf" ], directory )

		expect( fs.readdirSync( directory ) ).toEqual( [] )
	})

	// The whole point. This directory is shared with whatever database the
	// developer has in `.tmp`, and with any seed running beside this one, so
	// anything this run did not write is never this run's to delete — however
	// new it looks.
	it("leaves everything it is not named", () => {
		const directory = a_directory_holding(
			".gitkeep",
			"theirs.jpg",
			"ours.pdf",
		)

		remove_uploads( [ "ours.pdf" ], directory )

		expect( fs.readdirSync( directory ).sort() ).toEqual(
			[ ".gitkeep", "theirs.jpg" ],
		)
	})

	it("does not mind a file that has already gone", () => {
		const directory = a_directory_holding( ".gitkeep" )

		expect( () => remove_uploads( [ "gone.pdf" ], directory ) )
			.not.toThrow()

		expect( fs.readdirSync( directory ) ).toEqual( [ ".gitkeep" ] )
	})

	// The names come from a database column, so they are treated as untrusted
	// input rather than as paths: nothing that could climb out of the directory
	// is ever handed to `rm`.
	it("ignores a name that is a path rather than a name", () => {
		const directory = a_directory_holding( ".gitkeep" )
		const sibling = path.join( directory, "..", "sibling.txt" )
		fs.writeFileSync( sibling, "x" )

		remove_uploads( [ "../sibling.txt", "nested/one.pdf" ], directory )

		expect( fs.existsSync( sibling ) ).toBe( true )
	})

	it("does not remove .gitkeep even if asked to", () => {
		const directory = a_directory_holding( ".gitkeep" )

		remove_uploads( [ ".gitkeep" ], directory )

		expect( fs.readdirSync( directory ) ).toEqual( [ ".gitkeep" ] )
	})

	it("does not mind the directory having gone", () => {
		expect( () => remove_uploads( [ "ours.pdf" ], "/nowhere" ) )
			.not.toThrow()
	})
})
