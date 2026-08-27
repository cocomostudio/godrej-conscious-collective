
/**
 |
 | Whether the seed has been told to go ahead, and how it asks when it has not.
 |
 | The seed is written for an empty database. It does not reconcile, so running
 | it over content somebody made is not a top-up — it is a deletion followed by
 | a rebuild of something else. The refusals in `guards.ts` keep it away from
 | anything that is not local SQLite; this keeps it away from a local database
 | its owner still wanted, which no environment variable can tell it.
 |
 | So it asks, every time, and the answer has to be typed. `-y` is for the
 | person who is running it for the fifth time this afternoon and means it.
 |
 */

import readline from "node:readline/promises"

import { refuse } from "./guards.ts"

/**
 |
 | `given` — the flag was passed, so there is nothing to ask.
 | `must_be_asked` — there is a terminal and a person at it.
 | `cannot_be_asked` — there is no terminal, so there is nobody to ask.
 |
 */
export type Consent = "given" | "must_be_asked" | "cannot_be_asked"

const YES_FLAGS = [ "-y", "--yes" ]

/**
 |
 | The flag is read before the terminal is looked for, because the flag is how
 | something with no terminal says it meant this.
 |
 */
export function consent_from (
	argv: string[],
	is_a_terminal: boolean,
): Consent {
	if ( argv.some( ( argument ) => YES_FLAGS.includes( argument ) ) ) {
		return "given"
	}

	return is_a_terminal ? "must_be_asked" : "cannot_be_asked"
}

/**
 |
 | What is about to happen, named rather than summarised: a person deciding
 | whether to answer yes is deciding about that file and that directory, so
 | both are printed as paths.
 |
 */
export function disclaimer ( database: string, uploads: string ) {
	const rule = "─".repeat( 72 )

	return [
		"",
		rule,
		"",
		"  THIS DELETES THE DATABASE. IT DOES NOT ADD TO IT.",
		"",
		rule,
		"",
		`  Deletes   ${database}`,
		`  Empties   ${uploads}`,
		"  Rebuilds  both, from the seed.",
		"",
		"  The seed is written for an empty database. It does not merge with",
		"  what is already there and it does not skip it — every page, every",
		"  session, every lead and every uploaded file in that database is",
		"  gone the moment this continues, and none of it comes back.",
		"",
		"  If it holds anything you would miss, answer no and copy it",
		"  somewhere else first.",
		"",
		rule,
		"",
	].join( "\n" )
}

/**
 |
 | `y` and `yes` are the two answers that continue, in any case. Everything
 | else is a no, an empty line included, which is why the prompt shows the
 | default in capitals.
 |
 */
export async function answered_yes () {
	const prompt = readline.createInterface( {
		input: process.stdin,
		output: process.stdout,
	} )

	try {
		const answer = await prompt.question( "Delete it and rebuild? [y/N] " )
		const said = answer.trim().toLowerCase()

		return said === "y" || said === "yes"
	} finally {
		prompt.close()
	}
}

/**
 |
 | Reading a question nobody can answer ends one of two ways: an empty line the
 | instant the stream closes, which looks like a decision and is not one, or a
 | wait with no end to it, which is a job holding its runner until a timeout
 | kills it. Neither is a yes, and neither says why, so this says why instead.
 |
 */
export function refuse_without_a_terminal (): never {
	refuse(
		`Standard input is not a terminal, so there is nobody to ask. Pass -y `
			+ `if this is a script and it means it.`,
	)
}
