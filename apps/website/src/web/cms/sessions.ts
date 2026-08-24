
/**
 |
 | Everything a session page is derived from that is not a component.
 |
 | A Page's page is its regions. A session's page is its regions **plus** a
 | masthead and a details list built from top-level attributes — the category it
 | belongs to, the days and hours it runs, what it costs, where it is and who it
 | is for. None of that arrives as a block, so all of it is worked out here and
 | handed to root assembly as blocks like any other.
 |
 | It is data in and data out. Which icon a detail wears and how a row is laid
 | out belong to the block that renders it; a detail here says what it *is*.
 |
 */

import type {
	Age_Group,
	Category,
	Session_Entry,
	Session_Instance,
} from "./envelope.ts"
import type { Role } from "./context-colours.ts"

import { date_range } from "./event-dates.ts"

/**
 |
 | Everything that follows from which category a session is in: where its back
 | link goes, what that link calls the place, and which of the resolved event's
 | six colours the page wears.
 |
 | One table rather than three, because all three answer the same question and a
 | fifth category should be one edit rather than three that can disagree.
 |
 | The plural is the listing page's own title, so "Back to Showcases" names a
 | page that exists rather than describing one, and the paths are the route
 | table's. The colour is an **alias**, so pointing the context colour at the
 | category's role is the whole of it: every block that says `bg-context` paints
 | in the category's colour with nothing in the block changing.
 |
 */
const CATEGORIES: Record<Category, {
	plural: string
	path: string
	role: Role
}> = {
	"Conversation": {
		path: "/conversations",
		plural: "Conversations",
		role: "conversation",
	},
	"Experience": {
		path: "/experiences",
		plural: "Experiences",
		role: "experience",
	},
	"Showcase": { path: "/showcases", plural: "Showcases", role: "showcase" },
	"Workshop": { path: "/workshops", plural: "Workshops", role: "workshop" },
}

/**
 |
 | The fallbacks below are not dead code, and the types say otherwise only
 | because a type is a claim about what the CMS sends rather than a guarantee.
 | The catalogue grows in the CMS before it grows here — the block registry
 | makes the same allowance for the same reason — so a fifth category costs a
 | visitor the theme colour and a back link to the home page, rather than
 | costing them the page.
 |
 */
export function role_of ( session: Session_Entry ): Role {
	return CATEGORIES[session.category]?.role ?? "theme"
}

export function back_link_to_category ( session: Session_Entry ) {
	const category = CATEGORIES[session.category]

	return category
		? { label: `Back to ${category.plural}`, url: category.path }
		: { label: "Back to Home", url: "/" }
}

/* _____
 | The details list.
 |
 */

export type Detail_Icon =
	| "tag"
	| "clock"
	| "user"
	| "calendar"
	| "location-pin"
	| "ticket"

export type Detail = {
	icon: Detail_Icon
	/** Null where the row is nothing but its link — a price-less booking. */
	label: string | null
	link?: { label: string; url: string } | null
}

/**
 |
 | The rupee. **The price stores no currency** — the event runs in one city
 | and has one, and storing it per session only invites two sessions to disagree — so
 | the symbol lives here, where it is a fact about the site rather than about
 | any session.
 |
 */
const CURRENCY = "₹"

const AGE_GROUPS: Record<Age_Group, string> = {
	"Adults": "Adults",
	"All": "All Ages",
	"Children": "Children",
}

/**
 |
 | Everything the sidebar says about a session, in the order the design reads
 | it: what kind of thing it is, when it runs, who it is for, which days, where,
 | and what it costs.
 |
 */
export function session_details ( session: Session_Entry ): Detail[] {
	return [
		category_detail( session ),
		...time_details( session ),
		age_group_detail( session ),
		dates_detail( session ),
		venue_detail( session ),
		price_detail( session ),
	].filter( ( detail ): detail is Detail => detail !== null )
}

function category_detail ( session: Session_Entry ): Detail | null {
	return session.category
		? { icon: "tag", label: session.category }
		: null
}

/**
 |
 | **An all-day session says so and shows no times at all.** A start time that
 | does not mean anything misleads a visitor deciding when to come, and the
 | stored instances keep their hours either way — a calendar entry still needs
 | them.
 |
 | Otherwise every instance gets a row, so a visitor can pick one. The day is
 | named only when a session has more than one; a session that runs once has its
 | day in the row below already.
 |
 */
function time_details ( session: Session_Entry ): Detail[] {
	if ( session.all_day_event ) {
		return [ { icon: "clock", label: "All day" } ]
	}

	const instances = Array.isArray( session.instances )
		? session.instances
		: []

	const with_the_day = instances.length > 1

	return instances
		.map( ( instance ) => when( instance, with_the_day ) )
		.filter( ( label ): label is string => label !== null )
		.map( ( label ) => ( { icon: "clock" as const, label } ) )
}

function age_group_detail ( session: Session_Entry ): Detail | null {
	const label = AGE_GROUPS[session.age_group]

	return label ? { icon: "user", label } : null
}

/**
 |
 | The days the session runs, as one range. Both ends are derived by the CMS
 | from the instances, so this reads what the editor's instances already said.
 |
 */
function dates_detail ( session: Session_Entry ): Detail | null {
	const dates = date_range(
		session.session_date_first,
		session.session_date_last,
	)

	if ( !dates ) {
		return null
	}

	return {
		icon: "calendar",
		label: dates.end
			? `${dates.start.label} – ${dates.end.label}`
			: dates.start.label,
	}
}

/**
 |
 | Where it is. The venue is a link component, so its url points at a map — the
 | one reader that attribute has, and the reason it is a link rather than a
 | string.
 |
 */
function venue_detail ( session: Session_Entry ): Detail | null {
	const label = session.venue?.label

	if ( !label ) {
		return null
	}

	return session.venue?.url
		? {
			icon: "location-pin",
			label: null,
			link: {
				label,
				url: session.venue.url,
			},
		}
		: { icon: "location-pin", label }
}

/**
 |
 | **Zero reads "Free"; empty shows no price at all**, because a visitor who
 | sees nothing where a price would be assumes it is missing rather than that
 | the session is free.
 |
 | **The booking link is independent of the price.** A free session can still
 | need one for capacity, so the row appears for either — and when there is a
 | price the link sits beside it, which is where the design puts it.
 |
 | The link always reads "Buy tickets", which is the static site's own copy, and
 | it is absent entirely when no booking link is set. It does not soften itself
 | for a free session: one label means the control is recognisable wherever a
 | visitor meets it, and what a place costs is what the price beside it says.
 |
 */
const BOOKING = "Buy tickets"

function price_detail ( session: Session_Entry ): Detail | null {
	const has_a_price = typeof session.price === "number"
	const booking = session.checkout_url

	if ( !has_a_price && !booking ) {
		return null
	}

	return {
		icon: "ticket",
		label: has_a_price
			? ( session.price === 0
				? "Free"
				: `${CURRENCY} ${session.price}` )
			: null,
		link: booking ? { label: BOOKING, url: booking } : null,
	}
}

/* _____
 | Times of day.
 |
 | Formatted where the event is. An instance is stored as an instant, so the
 | hour a visitor reads is only decided once a place is named — and formatting
 | in the server's own zone would put wherever it happens to run between an
 | editor's 10am and a reader's. One city, one zone, named once. The CMS derives
 | a session's dates against the same one.
 |
 */
const EVENT_TIMEZONE = "Asia/Kolkata"

const TIME_OF_DAY = new Intl.DateTimeFormat( "en-GB", {
	hour: "numeric",
	hour12: true,
	minute: "2-digit",
	timeZone: EVENT_TIMEZONE,
} )

const DAY = new Intl.DateTimeFormat( "en-GB", {
	day: "numeric",
	month: "short",
	timeZone: EVENT_TIMEZONE,
} )

function when (
	instance: Session_Instance,
	with_the_day: boolean,
): string | null {
	const start = as_a_moment( instance?.time_start )
	const end = as_a_moment( instance?.time_end )

	if ( !start ) {
		return null
	}

	const hours = end
		? `${TIME_OF_DAY.format( start )} – ${TIME_OF_DAY.format( end )}`
		: TIME_OF_DAY.format( start )

	return with_the_day ? `${DAY.format( start )}, ${hours}` : hours
}

function as_a_moment ( value: unknown ): Date | null {
	if ( typeof value !== "string" || value === "" ) {
		return null
	}

	const parsed = new Date( value )

	return Number.isNaN( parsed.getTime() ) ? null : parsed
}
