
/**
 |
 | The pages the browser tests are served, in the same envelope shapes the
 | server-side tests use: the Archive's timeline, a marquee beside a full-bleed
 | image, and a section's spider web.
 |
 | The Archive is laid out as the seed lays it out: a two-column page whose
 | section pads below itself and not above, so that the timeline opens the
 | column. Three entries, so that the first, a middle and the last each exist,
 | and the middle one's description is long enough to grow it past the fan.
 |
 */

import type { Envelope } from "../../src/web/cms/envelope.ts"

import {
	archive_entry,
	archive_timeline_listing,
	envelope,
	event,
	full_bleed_image_block,
	heading,
	image,
	instance,
	marquee,
	page_shell,
	palette_colour,
	responsive_image,
	section,
	session_card,
	session_listing,
	session_listing_with_filtration,
	session_schedule_list,
	session_schedule_row,
	wysiwyg,
} from "../support/envelopes.ts"

export const ARCHIVE_ENTRIES = [
	{
		description: "The year we reclaimed cool.",
		name: "Reclaiming Cool",
		year: "2025",
	},
	{
		description: Array.from(
			{ length: 12 },
			() => "Grown rather than made, over three days and two nights.",
		).join( " " ),
		name: "Grown, Not Made",
		year: "2024",
	},
	{
		description: "Where it started.",
		name: "The First Edition",
		year: "2023",
	},
]

/** The alt text of an entry's front photograph — the one the fan does not rotate. */
export function front_photograph_of ( year: string ) {
	return `The front photograph from ${year}`
}

/** The same timeline, in a section that pads neither edge. */
export const BARE_SECTION_PATH = "/archives-in-a-bare-section"

/** A marquee above a full-bleed image, on each of the two page layouts. */
export const BLEEDING_MARQUEE_PATHS = {
	"one-column": "/a-bleeding-marquee-in-one-column",
	"two-column": "/a-bleeding-marquee-in-two-columns",
}

/** A section with a spider web turned a quarter in its top-right corner. */
export const TURNED_PATTERN_PATH = "/a-turned-pattern"

/** A section with a spider web nobody placed, coloured or turned. */
export const PLAIN_PATTERN_PATH = "/a-plain-pattern"

/** The site header's links, on every page that is not the Archive. */
const NAVIGATION = page_shell( {
	navigation_header: [
		{ label: "Schedule", style: "plain", url: "/schedule" },
		{ label: "Showcases", style: "plain", url: "/showcases" },
	],
} )

/** A category page long enough to scroll several screens down. */
export const CATEGORY_PATH = "/showcases"

/** The schedule page, just as long. */
export const SCHEDULE_PATH = "/schedule"

/** A page that scrolls, but by less than a screen, at the small breakpoint. */
export const SHORT_PATH = "/a-short-page"

/** Two session carousels, one under the other, on each of the two page layouts. */
export const CAROUSEL_PATHS = {
	"one-column": "/carousels-in-one-column",
	"two-column": "/carousels-in-two-columns",
}

/** The same carousel, under a heading with no link beside it. */
export const UNLINKED_CAROUSEL_PATH = "/a-carousel-without-a-link"

/**
 |
 | Four sessions, so the first is featured, with a cover of each shape. The
 | covers are served by the test itself, at the sizes their names say.
 |
 */
export const FEATURED_PATHS = {
	landscape: "/a-featured-landscape-cover",
	portrait: "/a-featured-portrait-cover",
}

export const COVER_SIZES = {
	landscape: { height: 600, width: 1600 },
	portrait: { height: 1600, width: 600 },
}

/**
 |
 | A page whose event tuned its theme buttons, with the 2027 design's values:
 | the header's Register Now has a colour at each state to move between.
 |
 */
export const TUNED_BUTTONS_PATH = "/tuned-buttons"

/** One heading block at each of the six sizes. */
export const HEADINGS_PATH = "/six-headings"

export const PAGES: Record<string, Envelope> = {
	[CAROUSEL_PATHS["one-column"]]: carousels_page( "one-column" ),
	[CAROUSEL_PATHS["two-column"]]: carousels_page( "two-column" ),
	[UNLINKED_CAROUSEL_PATH]: carousels_page( "one-column", false ),
	[FEATURED_PATHS.landscape]: featured_page( "landscape" ),
	[FEATURED_PATHS.portrait]: featured_page( "portrait" ),
	[HEADINGS_PATH]: headings_page(),
	[TUNED_BUTTONS_PATH]: tuned_buttons_page(),
	"/archives": archive_page( "below" ),
	[BARE_SECTION_PATH]: archive_page( "none" ),
	[BLEEDING_MARQUEE_PATHS["one-column"]]: bleeding_marquee_page( "one-column" ),
	[BLEEDING_MARQUEE_PATHS["two-column"]]: bleeding_marquee_page( "two-column" ),
	[PLAIN_PATTERN_PATH]: pattern_page( {} ),
	[TURNED_PATTERN_PATH]: pattern_page( {
		background_pattern_color: "white",
		background_pattern_position: "top-right",
		background_pattern_rotation: 90,
	} ),
	[CATEGORY_PATH]: category_page(),
	[SCHEDULE_PATH]: schedule_page(),
	[SHORT_PATH]: short_page(),
}

function bleeding_marquee_page (
	page_layout: keyof typeof BLEEDING_MARQUEE_PATHS,
) {
	return envelope( {
		main_region: [
			section( "Bleeding", {
				content: [
					marquee( "The venue", "The dates" ),
					full_bleed_image_block( "/uploads/bled.png", {
						alt: "Edge to edge",
					} ),
				],
			} ),
		],
		page_layout,
		title: "Bleeding",
	} )
}

function sessions ( category: string, count: number, cover?: string ) {
	return Array.from( { length: count }, ( _, index ) =>
		session_card( {
			category: category as ReturnType<typeof session_card>["category"],
			cover: cover ? responsive_image( cover ) : null,
			name: `${category} ${index + 1}`,
			path: `/sessions/${category.toLowerCase()}-${index + 1}`,
			standfirst: "A standfirst, shown on the featured card alone.",
		} )
	)
}

function carousels_page (
	page_layout: keyof typeof CAROUSEL_PATHS,
	linked = true,
) {
	const row = ( title: string, category: string ) =>
		section( title, {
			content: [ session_listing( category, sessions( category, 6 ) ) ],
			heading: {
				content: title,
				link: linked
					? { label: "View All", style: "plain", url: "/all" }
					: null,
			},
		} )

	return envelope( {
		main_region: [
			row( "Showcases", "Showcase" ),
			row( "Conversations", "Conversation" ),
		],
		page_layout,
		title: "Carousels",
	} )
}

function featured_page ( shape: keyof typeof FEATURED_PATHS ) {
	return envelope( {
		main_region: [
			section( "Workshops", {
				content: [
					session_listing(
						"Workshop",
						sessions( "Workshop", 4, `/uploads/${shape}.svg` ),
					),
				],
			} ),
		],
		page_layout: "one-column",
		title: "Featured",
	} )
}

function headings_page () {
	return envelope( {
		main_region: [
			section( "Headings", {
				content: [ 1, 2, 3, 4, 5, 6 ].map( ( level ) =>
					heading( `A heading at size ${level}`, { level: `h${level}` } )
				),
			} ),
		],
		page_layout: "one-column",
		title: "Headings",
	} )
}

function tuned_buttons_page () {
	const tuned = event( {
		theme: palette_colour( "0, 85, 230", {
			solid_button_border: "0, 85, 230",
			solid_button_border__active: "0, 75, 204",
			solid_button_border__hover: "0, 57, 153",
			solid_button_fill: "0, 85, 230",
			solid_button_fill__active: "0, 75, 204",
			solid_button_fill__hover: "0, 57, 153",
		} ),
	} )

	return envelope( {
		main_region: [ section( "Buttons" ) ],
		page_layout: "one-column",
		title: "Buttons",
	}, { main_event: tuned, resolved_event: tuned } )
}

function pattern_page ( placement: {
	background_pattern_color?: string
	background_pattern_position?: string
	background_pattern_rotation?: number
} ) {
	return envelope( {
		main_region: [
			section( "Patterned", {
				background_gradient: "light",
				background_pattern: "spider-web",
				content: [ wysiwyg( "Words over a spider web." ) ],
				...placement,
			} ),
		],
		page_layout: "one-column",
		title: "Patterned",
	} )
}

/**
 |
 | Thirty showcases, in two age groups and at two prices, so that the listing
 | has facets to offer and its header carries the trigger.
 |
 */
function category_page () {
	const sessions = Array.from( { length: 30 }, ( _, index ) =>
		session_card( {
			age_group: index % 2 === 0 ? "Adults" : "All",
			category: "Showcase",
			name: `Showcase ${index + 1}`,
			path: `/sessions/showcase-${index + 1}`,
			price: index % 3 === 0 ? 0 : 500,
		} )
	)

	return envelope( {
		main_region: [
			section( "Showcases — the listing", {
				content: [ session_listing_with_filtration( "Showcase", sessions ) ],
			} ),
		],
		page_layout: "two-column",
		title: "Showcases",
	}, { page_shell: NAVIGATION } )
}

/** Three days, ten sessions a day. */
function schedule_page () {
	const days = [ "2025-12-11", "2025-12-12", "2025-12-13" ]
	const rows = days.flatMap( ( day, day_index ) =>
		Array.from( { length: 10 }, ( _, index ) =>
			session_schedule_row( {
				category: index % 2 === 0 ? "Workshop" : "Showcase",
				instances: [ instance( day, `${10 + index}:00`, `${10 + index}:45` ) ],
				name: `Session ${day_index + 1}.${index + 1}`,
				path: `/sessions/session-${day_index + 1}-${index + 1}`,
			} )
		)
	)

	return envelope( {
		main_region: [
			section( "The schedule", {
				content: [ session_schedule_list( rows ) ],
			} ),
		],
		page_layout: "two-column",
		title: "Schedule",
	}, { page_shell: NAVIGATION } )
}

function short_page () {
	return envelope( {
		main_region: [
			section( "A few words", {
				content: [ wysiwyg(
					...Array.from( { length: 8 }, () => "A paragraph long enough to wrap over a few lines on a phone, so that eight of them push the page past one screen." ),
				) ],
			} ),
		],
		page_layout: "one-column",
		title: "A short page",
	}, { page_shell: NAVIGATION } )
}

function entry_of ( { description, name, year }: typeof ARCHIVE_ENTRIES[number] ) {
	return {
		...archive_entry( {
			content: [ wysiwyg( `A snapshot from ${year}.` ) ],
			description,
			name,
			year,
		} ),
		featured_images: [
			image( `/uploads/${year}-front.png`, { alt: front_photograph_of( year ) } ),
			image( `/uploads/${year}-left.png`, { alt: `The left photograph from ${year}` } ),
			image( `/uploads/${year}-right.png`, { alt: `The right photograph from ${year}` } ),
		],
	}
}

function archive_page ( spacing_around: string ) {
	return envelope( {
		main_region: [
			section( "The timeline", {
				content: [
					archive_timeline_listing( ...ARCHIVE_ENTRIES.map( entry_of ) ),
				],
				spacing_around,
			} ),
		],
		page_layout: "two-column",
		title: "Archives",
	} )
}
