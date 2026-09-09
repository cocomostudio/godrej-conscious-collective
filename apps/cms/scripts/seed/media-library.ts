
/**
 |
 | Emptying the media library when the files are not on this machine.
 |
 | ─── WHY THIS EXISTS AT ALL ─────────────────────────────────────────────────
 |
 | Nothing else in this seed deletes an uploaded file. It is worth being exact
 | about why, because the obvious assumptions are all wrong:
 |
 |   • **Deleting a content entry does not delete the media it points at.** In
 |     Strapi a file is an entity of its own and an entry merely relates to it.
 |     Dropping every page in the database leaves every picture those pages
 |     used sitting in the library with nothing referring to it.
 |
 |   • **Dropping the tables does not either**, and is worse: it takes the file
 |     rows with it, so the objects in the bucket lose the only record that
 |     they were ever anybody's.
 |
 |   • The one thing that deletes a stored object is the upload plugin's own
 |     `remove`, which calls `provider.delete` for the file and again for each
 |     of the responsive formats it generated — six more objects per image —
 |     and then deletes the row.
 |
 | So clearing an S3-backed library is a per-file call against a booted
 | application, and it has to happen **before** the tables are dropped, because
 | the rows are the only list of what to delete.
 |
 | A local library needs none of this: `delete_uploads` empties the directory
 | and the directory is the whole store. That is why this is reached for only
 | when `Media_Target.clearable_from_disk` is false.
 |
 | ─── WHAT IT REFUSES TO GUESS AT ────────────────────────────────────────────
 |
 | `remove` deletes from the provider only when the file's recorded provider
 | matches the one this instance is configured with. A library holding rows
 | written while the instance was on `local`, cleared by an instance configured
 | for `aws-s3`, would have those rows deleted and their objects left — a silent
 | orphan, which is the one outcome this is here to prevent. Those are counted
 | and reported rather than skipped quietly, with enough in the report to find
 | them by hand.
 |
 */

import { record_failure } from "./report.ts"

import type { Strapi } from "./lib/strapi.ts"

const FILE_MODEL = "plugin::upload.file"

/** How many rows to hold in memory at once. */
const PAGE = 100

export async function clear_media_library ( strapi: Strapi ) {
	const configured_provider = strapi.config.get( "plugin::upload" ).provider

	let removed = 0
	let stranded = 0

	// Always the first page: every pass deletes what it read, so the rows that
	// were the second page become the first.
	for ( ;; ) {
		const files = await strapi.db.query( FILE_MODEL ).findMany( {
			limit: PAGE,
			orderBy: { id: "asc" },
		} )

		if ( files.length === 0 ) {
			break
		}

		for ( const file of files ) {
			if ( file.provider !== configured_provider ) {
				stranded += 1
				report_stranded( file, configured_provider )
			}

			try {
				await strapi.plugin( "upload" ).service( "upload" ).remove(
					file,
				)
				removed += 1
			} catch ( error ) {
				report_undeletable( file, error )

				// The row has to go regardless, or the next page never
				// advances and this loops forever on a file the provider will
				// not take back.
				await strapi.db.query( FILE_MODEL ).delete( {
					where: { id: file.id },
				} )
			}
		}
	}

	return { removed, stranded }
}

function report_stranded ( file: any, configured_provider: string ) {
	record_failure( {
		what: `The stored file "${file.name}" was not deleted from its provider`,
		where: `the media library — ${file.url}`,
		why: `it was uploaded through the "${file.provider}" provider and this `
			+ `instance is configured for "${configured_provider}", so the `
			+ `upload plugin declines to delete it`,
		how: [
			`The database row is gone; the stored object is not.`,
			`Delete it where it actually lives: ${file.url}`,
			file.formats
				? `Its resized copies sit beside it — ${
					Object.keys( file.formats ).join( ", " )
				} — and need the same treatment.`
				: `It has no resized copies.`,
			`To avoid this next time, run the seed with UPLOAD_PROVIDER set to `
			+ `the provider the existing files were uploaded through.`,
		],
	} )
}

function report_undeletable ( file: any, error: unknown ) {
	record_failure( {
		what: `The stored file "${file.name}" could not be deleted`,
		where: `the media library — ${file.url}`,
		why: error instanceof Error ? error.message : String( error ),
		how: [
			`The database row was removed so the seed could continue; the `
			+ `stored object was not.`,
			`Delete it by hand at ${file.url}`,
			`If this was a network failure rather than a permissions one, the `
			+ `object may still be there on a retry — but the row naming it is `
			+ `not, so this report is the only record of it.`,
		],
	} )
}
