
/**
 |
 | What the seed could not do, and what a person has to do by hand instead.
 |
 | The seed reaches the network in one place — the registration slideshow, see
 | `lib/uploads.ts` — and that call is allowed to fail by design, because the
 | test harness runs this seed on every boot and must not depend on somebody
 | else's uptime. On a developer's machine a skipped slide is a warning nobody
 | needs to act on. On the production host, whose outbound access is severely
 | constrained, it is the expected case and somebody has to finish the job in
 | the admin panel afterwards.
 |
 | A warning scrolled past in a two-minute boot log is not a handover. So every
 | failure is recorded with the four things the person picking it up needs —
 | what was missing, where it belongs, why it failed, and the steps to put it
 | there — and the whole set is printed at the end and written to a file that
 | outlives the terminal.
 |
 | ─── WHY THIS IS MODULE STATE ───────────────────────────────────────────────
 |
 | Failures are diagnostics, not content. Threading a collector through
 | `write_seed_content` → `write_page_shells` → `upload_slideshow` would put a
 | parameter into three signatures so that one of them could use it, and every
 | writer added later would inherit the same pass-through. The alternative —
 | returning failures up through functions whose return values already mean
 | something else — is worse.
 |
 | `reset` is exported for the callers that run the seed more than once in a
 | process. The CMS test harness is the one that does.
 |
 */

import fs from "node:fs"
import path from "node:path"

import { CMS_DIR } from "./guards.ts"

export type Failure = {
	/** What is missing, named as an editor would recognise it. */
	what: string
	/** Where it belongs — content type, attribute, entry. */
	where: string
	/** Why the seed could not do it, in the terms the machine reported. */
	why: string
	/** What to do instead, one step per line. */
	how: string[]
}

const failures: Failure[] = []

export function record_failure ( failure: Failure ) {
	failures.push( failure )
}

export function recorded_failures (): readonly Failure[] {
	return failures
}

export function reset_failures () {
	failures.length = 0
}

/**
 |
 | Where the report is written.
 |
 | `.tmp` because it is already the directory this application treats as
 | scratch and is already ignored by git. The name carries no timestamp: the
 | report describes the last run, and a directory accumulating one file per
 | seed is the problem `delete_uploads` exists to solve.
 |
 */
export function report_file () {
	return path.join( CMS_DIR, ".tmp", "seed-report.md" )
}

/**
 |
 | Prints the report and writes it, and returns the path when there was
 | anything to write.
 |
 | A clean run writes nothing and says one line. A run that leaves work behind
 | says so at the end, where the last thing on the screen is the thing still to
 | be done, rather than at the moment of failure two minutes earlier.
 |
 */
export function write_report ( heading: string ): string | null {
	if ( failures.length === 0 ) {
		console.log( "Nothing was left unfinished.\n" )
		return null
	}

	const report = render( heading )
	const file = report_file()

	fs.mkdirSync( path.dirname( file ), { recursive: true } )
	fs.writeFileSync( file, report )

	console.log( report )
	console.log( `This is also at ${file}\n` )

	return file
}

function render ( heading: string ) {
	const rule = "─".repeat( 72 )
	const plural = failures.length === 1 ? "thing" : "things"

	const lines = [
		"",
		rule,
		"",
		`  ${failures.length} ${plural} could not be seeded and need adding by hand.`,
		"",
		`  ${heading}`,
		"",
		rule,
		"",
	]

	failures.forEach( ( failure, index ) => {
		lines.push(
			`  ${index + 1}. ${failure.what}`,
			"",
			`     Belongs to   ${failure.where}`,
			`     Failed with  ${failure.why}`,
			"",
			"     To add it by hand:",
			...failure.how.map( ( step ) => `       • ${step}` ),
			"",
		)
	} )

	lines.push( rule, "" )

	return lines.join( "\n" )
}
