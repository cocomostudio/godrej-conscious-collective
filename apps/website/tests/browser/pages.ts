
/**
 |
 | The pages the browser tests are served, in the same envelope shapes the
 | server-side tests use.
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
	image,
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

export const PAGES: Record<string, Envelope> = {
	"/archives": archive_page( "below" ),
	[BARE_SECTION_PATH]: archive_page( "none" ),
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
