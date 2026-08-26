
/**
 |
 | Which instance a calendar control offers, and whether it offers one at all.
 |
 | A session runs as one or more **instances**, and a control can only add one
 | of them. The rule is the earliest one still to come — the instance somebody
 | reading the page can actually turn up to.
 |
 | ─── THE CLOCK IS THE BROWSER'S, DELIBERATELY ───────────────────────────────
 |
 | Every function here takes `now` as `number | null`, and **null means the
 | clock has not been read** rather than "use the current time". That is the
 | whole reason the parameter exists.
 |
 | Page responses are cached, keyed by pathname and cleared by a publish. A
 | decision made against the clock while a page is being rendered is therefore
 | frozen into the cache entry: correct for the visitor who caused it to be
 | written, and progressively wrong for everybody served it afterwards, with
 | nothing to invalidate it because nothing was published. A session that ended
 | at noon would still be offering its button at midnight.
 |
 | So the server answers a question the clock has no part in — the earliest
 | instance, full stop — and the browser corrects it on arrival, where the clock
 | is the visitor's own and nothing is cached. See `use_client_now`.
 |
 | The cost is a control that can appear and then withdraw itself on a page
 | whose instances are all in the past. That is accepted: it is a page nobody is
 | deciding anything from, and the alternative is a stale answer served
 | confidently.
 |
 */

/**
 |
 | One instance, as the facts a calendar entry is made of.
 |
 | It is the **unsigned** form: what a session says about one of its instances,
 | before an address exists for it. Root assembly derives these and the server
 | turns each into a signed `Calendar_Link` — see `calendar-signing.server.ts`.
 |
 | `path` is this site's own path to the session, never a whole address. The
 | endpoint joins it to its own origin, which is what keeps a link inside a
 | calendar entry from being able to point anywhere else.
 |
 */
export type Calendar_Instance = {
	title: string
	/** ISO instant. */
	start: string
	/** ISO instant, or null for an instance with no stated end. */
	end: string | null
	/** The venue, as a calendar's LOCATION. */
	at: string | null
	path: string | null
	/** A line about the session, as a calendar's DESCRIPTION. */
	note: string | null
}

/**
 |
 | One instance, and the address that adds it.
 |
 | The `href` is minted server-side and signed — see `calendar-signing.server.ts`
 | — which is why a link arrives here already built rather than being assembled
 | wherever it is drawn. The two ends travel beside it because choosing between
 | instances is a decision made in the browser, after the href exists.
 |
 */
export type Calendar_Link = {
	/** ISO instant. */
	start: string
	/** ISO instant, or null for an instance with no stated end. */
	end: string | null
	href: string
}

/**
 |
 | The instance to offer, or null when there is none left to offer.
 |
 | Ordered by start rather than by the order the CMS listed them in: an
 | editor's instances are in whatever order the editor dragged them into, and
 | "the earliest" has to mean the earliest.
 |
 */
export function upcoming_link (
	links: Calendar_Link[],
	now: number | null,
): Calendar_Link | null {
	const offerable = links
		.filter( ( link ) => moment_of( link.start ) !== null )
		.filter( ( link ) => !is_over( link, now ) )
		.sort( ( one, other ) =>
			( moment_of( one.start ) ?? 0 )
			- ( moment_of( other.start ) ?? 0 )
		)

	return offerable[0] ?? null
}

/**
 |
 | Over means **ended**, not begun.
 |
 | Somebody standing in the room ten minutes in is the person most likely to
 | reach for the button, and a control that withdrew itself on the hour would
 | be gone exactly when it was wanted. An instance with no stated end is judged
 | on its start, because that is the only moment it has.
 |
 */
export function is_over ( link: Calendar_Link, now: number | null ): boolean {
	if ( now === null ) {
		return false
	}

	const ended = moment_of( link.end ) ?? moment_of( link.start )

	// Strictly past, not "reached": at the exact end instant it has not passed
	// yet, and the whole point of judging on the end rather than the start is
	// to keep the control for somebody who is still in the room.
	return ended === null ? true : ended < now
}

function moment_of ( value: string | null ): number | null {
	if ( typeof value !== "string" || value === "" ) {
		return null
	}

	const parsed = Date.parse( value )

	return Number.isNaN( parsed ) ? null : parsed
}
