
/**
 |
 | Listings — the components that fill themselves.
 |
 | Every other component in the catalogue holds what it shows. Most of these
 | hold a *question* instead — a category, a count, a layout — and the CMS
 | answers it when the page is asked for, out of the event that page resolved
 | to. That is what lets a page written once keep up with a programme that is
 | still changing.
 |
 | Three components and, between them, both ways a listing is filled. A session
 | listing holds a category and a count and nothing else — the CMS fills it from
 | the page's event when the page is asked for. A session list is curated, and
 | so is a contributor listing that is given anybody; a contributor listing left
 | empty fills itself the same way a session listing does.
 |
 | Every branch of that is seeded, because the failure this arrangement can have
 | is a listing that arrives empty, and an empty listing looks exactly like a
 | listing nobody has filled in yet.
 |
 */

export function session_listing ( category: string, count: number ) {
	return { __component: "list.session-listing-v1", category, count }
}

/**
 |
 | The category listing pages' listing. A category and nothing else: there is no
 | count, because the page shows every session of the category and the visitor
 | narrows it down themselves.
 |
 */
export function session_listing_with_filtration ( category: string ) {
	return {
		__component: "list.session-listing-with-filtration-v1",
		category,
	}
}

/**
 |
 | The schedule page's list. **It stores almost nothing**: which sessions it
 | holds and which document it links to both follow from the event the page
 | resolved to, and `spacing_around` is the whole of what an editor decides.
 |
 */
export function session_schedule_list ( spacing_around?: string ) {
	return {
		__component: "list.session-schedule-list-v1",
		...( spacing_around ? { spacing_around } : {} ),
	}
}

export function session_list ( sessions: any[] ) {
	return {
		__component: "list.session-list-v1",
		sessions: sessions.map( ( session ) => session.documentId ),
	}
}

export function contributor_listing (
	layout: "natural" | "carousel" | "grid",
	count: number,
	curated: any[] = [],
) {
	return {
		__component: "list.contributor-listing-v1",
		contributors: curated.map( ( person ) => person.documentId ),
		count,
		layout,
	}
}
