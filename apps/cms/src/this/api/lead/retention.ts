
/**
 |
 | When a registration is due for deletion.
 |
 | The event's end date plus twelve months, computed **once**, at submission,
 | and stored. Not derived on read, and not recomputed on any later write: an
 | editor correcting an event's end date months afterwards must not silently
 | move a retention window that has already been promised to somebody in
 | writing.
 |
 | **Nothing acts on the result.** No deletion job is built in this effort, so
 | `retain_until` is a record of a promise rather than an enforcement of one.
 | Said plainly here rather than left to read as done.
 |
 | Null when there is no main event or it carries no end date. A window that
 | cannot be computed is left empty rather than guessed from today — a guessed
 | date is a promise nobody made.
 |
 */

const MONTHS_OF_RETENTION = 12

export function retain_until ( date_end: string | Date | null | undefined ) {
	if ( !date_end ) {
		return null
	}

	// A Strapi `date` attribute arrives as `YYYY-MM-DD`, and reading it as a
	// bare date string is what keeps the runtime's timezone from sitting
	// between the day an editor typed and the day this promises. Anything
	// else — a `Date` from the database layer — is normalised to the same
	// shape first.
	const day = typeof date_end === "string"
		? date_end.slice( 0, 10 )
		: date_end.toISOString().slice( 0, 10 )

	const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec( day )

	if ( !parts ) {
		return null
	}

	const [ , year, month, date ] = parts

	// `Date.UTC` rolls the month over on its own, so December plus twelve is
	// the following December rather than month thirteen. The day of the month
	// is carried across unchanged, and the one case where that day does not
	// exist a year later — the 29th of February — rolls forward to the 1st of
	// March, which is a day later than promised rather than a year.
	return new Date( Date.UTC(
		Number( year ),
		Number( month ) - 1 + MONTHS_OF_RETENTION,
		Number( date ),
	) ).toISOString()
}
