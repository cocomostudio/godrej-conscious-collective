
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
	full_bleed_image_block,
	image,
	marquee,
	section,
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

export const PAGES: Record<string, Envelope> = {
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
