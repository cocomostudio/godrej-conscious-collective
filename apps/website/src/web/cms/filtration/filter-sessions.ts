
/**
 |
 | Which sessions survive a set of filters.
 |
 | Rows in, rows out, and no React anywhere in it. Everything else in this
 | directory is wiring — a provider holding the committed filters, a form that
 | commits new ones, a drawer that shows the form on a phone — and this is the
 | only part with an answer that can be right or wrong.
 |
 | **Filtering is client-side over the loaded set.** The CMS sends the whole
 | category, or the whole event, precisely so that narrowing it costs no
 | request: a visitor ticking "Day 2" is looking at a set that is already in the
 | browser. That is the reason the two filtration listings are the only
 | uncapped listings in the catalogue.
 |
 | Two rules, and every facet obeys both:
 |
 |   • **A facet with nothing selected filters nothing.** It is not "show me
 |     none of them"; it is "I have not asked about this".
 |
 |   • **Options within a facet widen; facets narrow.** Free *or* ticketed,
 |     showcase *or* workshop — but a free workshop is both, so asking for free
 |     and for workshops asks for the sessions that are both.
 |
 */

import type {
	Age_Group,
	Category,
	Session_Card,
} from "../envelope.ts"

/**
 |
 | What a session costs, as the filter asks about it.
 |
 | Two answers rather than three, because a visitor is choosing between paying
 | and not paying. The third state — a session that says nothing about its price
 | — is not an admission at all, and is handled where it arises rather than
 | given a name here.
 |
 */
export type Admission = "free" | "ticketed"

export const ADMISSIONS = [ "free", "ticketed" ] as const

/**
 |
 | The committed filters — what the listing is actually showing, as opposed to
 | what a visitor has ticked but not yet applied.
 |
 | Every facet is a list, including the ones a page never shows. A category
 | listing page has no category facet, so its `categories` stays empty and
 | filters nothing; the alternative is a shape per page and a predicate that
 | has to know which page it is on.
 |
 | Days are ISO day strings — `2025-12-11` — and never `Date` objects. A bare
 | day parsed into an instant puts the runtime's own timezone between the day an
 | editor typed and the day a visitor reads, which is the rule `event-dates.ts`
 | states and which every date in this build follows.
 |
 */
export type Filters = {
	categories: Category[]
	age_groups: Age_Group[]
	admissions: Admission[]
	days: string[]
}

export const NO_FILTERS: Filters = {
	admissions: [],
	age_groups: [],
	categories: [],
	days: [],
}

export function filter_sessions<Row extends Session_Card> (
	sessions: Row[],
	filters: Filters,
): Row[] {
	return sessions.filter( ( session ) =>
		matches_category( session, filters )
		&& matches_age_group( session, filters )
		&& matches_admission( session, filters )
		&& matches_day( session, filters )
	)
}

function matches_category ( session: Session_Card, { categories }: Filters ) {
	return categories.length === 0 || categories.includes( session.category )
}

/**
 |
 | **Set membership, not a threshold.**
 |
 | The static site takes the lowest of the selected age groups and shows every
 | session at or above it, which means asking for children's sessions answers
 | with the adults' ones too — the spec lists it as a defect to fix during the
 | lift, and this is the fix.
 |
 | An age group is a name rather than a number here, which is what makes the
 | threshold impossible to write by accident: `All`, `Children` and `Adults` do
 | not sit on a line.
 |
 */
function matches_age_group ( session: Session_Card, { age_groups }: Filters ) {
	return age_groups.length === 0 || age_groups.includes( session.age_group )
}

function matches_admission ( session: Session_Card, { admissions }: Filters ) {
	if ( admissions.length === 0 ) {
		return true
	}

	const admission = admission_of( session )

	return admission !== null && admissions.includes( admission )
}

/**
 |
 | **Zero is free, anything above it is ticketed, and empty is neither.**
 |
 | The difference between an empty price and a zero one is one the whole build
 | keeps — a card shows "Free" for zero and shows nothing at all for empty,
 | because a visitor who sees nothing where a price would be assumes it is
 | missing rather than that the session is free. Answering `null` here is the
 | same statement: a session nobody has priced has not been said to be free, and
 | has not been said to cost anything either.
 |
 */
export function admission_of ( session: Session_Card ): Admission | null {
	if ( typeof session.price !== "number" ) {
		return null
	}

	return session.price === 0 ? "free" : "ticketed"
}

function matches_day ( session: Session_Card, { days }: Filters ) {
	return days.length === 0
		|| days_of( session ).some( ( day ) => days.includes( day ) )
}

/**
 |
 | Every day a session runs on, first to last, inclusive.
 |
 | A session running across four days is on all four, so the day facet is a
 | range question rather than a comparison against one date — and the range is
 | the one the CMS derived from the instances, which is what the card's own day
 | badge draws.
 |
 | The walk is in UTC. Both ends are bare days with no time and no zone, so the
 | arithmetic is being done on a calendar rather than on a clock: fixing the
 | zone at UTC means the step from one day to the next is always twenty-four
 | hours, which is exactly what a calendar step is and what a local-time step
 | is not.
 |
 */
export function days_of ( session: Session_Card ): string[] {
	const first = as_a_day( session.session_date_first )
	const last = as_a_day( session.session_date_last ) ?? first

	if ( !first || !last || last < first ) {
		return first ? [ iso_day( first ) ] : []
	}

	const days: string[] = []

	for (
		let day = first;
		day <= last;
		day = new Date( day.getTime() + A_DAY )
	) {
		days.push( iso_day( day ) )
	}

	return days
}

const A_DAY = 24 * 60 * 60 * 1000

/**
 |
 | A bare day as an instant at midnight UTC — never in local time, for the
 | reason `event-dates.ts` gives at length: west of UTC, a local-midnight parse
 | of "2025-12-11" is the 10th.
 |
 */
function as_a_day ( value: string | null | undefined ): Date | null {
	if ( typeof value !== "string" ) {
		return null
	}

	const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec( value )

	if ( !parts ) {
		return null
	}

	return new Date( `${parts[1]}-${parts[2]}-${parts[3]}T00:00:00.000Z` )
}

function iso_day ( day: Date ): string {
	return day.toISOString().slice( 0, 10 )
}
