
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

import {
	type Slide,
	image,
	image_link,
} from "./components.ts"

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

/* _____
 | The Archive's two listings.
 |
 | Neither fills itself — they hold what they show, the way the rest of the
 | catalogue does. They are called listings because they are what the design
 | calls them, and because both of them show a group of past editions rather
 | than a single thing.
 |
 */

/**
 |
 | The home page's turning ring. Its slides are image links, exactly as the
 | carousel's and the Instagram feed's are, and the label under the middle one
 | is the link's label.
 |
 */
export function archive_carousel_listing ( slides: Slide[] ) {
	return {
		__component: "list.archive-carousel-listing-v1",
		slides: slides.map( ( slide ) =>
			image_link( slide.url, slide.label, slide.image )
		),
	}
}

export type Archive_Entry = {
	name: string
	year: string
	description: string
	/** Exactly three, fanned out on the timeline. */
	featured_images: string[]
	/** The snapshots, in the archive entry list. Each one becomes a slide. */
	content?: any[]
}

/**
 |
 | The Archives page's timeline. Its entries are a **repeatable component that
 | holds a region of its own**, which nothing else in this seed is: everything
 | inside an entry's `content` is a catalogue component and goes in exactly as
 | it would in a section.
 |
 */
export function archive_timeline_listing ( entries: Archive_Entry[] ) {
	return {
		__component: "list.archive-timeline-listing-v1",
		entries: entries.map( (
			{ content = [], description, featured_images, name, year },
		) => ( {
			content,
			description,
			// Decoration beside the edition's own name, so no alternative
			// text — the same rule the session covers follow.
			featured_images: featured_images.map( ( url ) =>
				image( { url } )
			),
			name,
			year,
		} ) ),
	}
}
