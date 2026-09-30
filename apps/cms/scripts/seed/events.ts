
/**
 |
 | Events — the CMS's editions.
 |
 | An event is what every other row in this seed hangs off: the site chrome,
 | the palette and the schedule document all follow the **main** one, and a
 | page or a session naming the other keeps its own colours while wearing the
 | main one's chrome. See decision record 00001.
 |
 */

import type { Strapi } from "./lib/strapi.ts"
import { upload_schedule_document } from "./lib/uploads.ts"

export type Seeded_Events = {
	main: any
	other: any
}

/**
 |
 | Two events.
 |
 | 2027 is the main one, so its dates and its Register Now button are the site
 | chrome on every page — including the pages belonging to 2029. 2029 exists so
 | that the resolution rule has something to resolve *to*: a page naming it
 | keeps its colours while wearing 2027's chrome, which is the whole shape of
 | the arrangement in one pair of rows.
 |
 | 2027's base colours are the website's fallback palette, and its button
 | colours come off the design's own button-state sheet. 2029's palette is a
 | second one entirely, so that a seeded site shows a palette belonging to an
 | event rather than to the site.
 |
 | The seed writes hex values only. The RGB triplets are **not** written here —
 | a middleware derives each one from its colour on save, and writing them by
 | hand would be a second copy of that rule which could disagree with the
 | first.
 |
 */
export async function write_events ( strapi: Strapi ): Promise<Seeded_Events> {
	const main = await strapi.documents( "api::event.event" ).create( {
		data: {
			...PALETTE_2027,
			date_end: "2027-12-13",
			date_start: "2027-12-11",
			is_archived: false,
			main: true,
			name: "Conscious Collective 2027",
			registrations_are_open: true,
			schedule: await upload_schedule_document(
				strapi,
				"conscious-collective-2027-schedule.pdf",
				"Conscious Collective 2027",
			),
		},
	} )

	const other = await strapi.documents( "api::event.event" ).create( {
		data: {
			...PALETTE_2029,
			date_end: "2029-12-05",
			date_start: "2029-12-02",
			is_archived: false,
			main: false,
			name: "Conscious Collective 2029",
			registrations_are_open: true,
			schedule: await upload_schedule_document(
				strapi,
				"conscious-collective-2029-schedule.pdf",
				"Conscious Collective 2029",
			),
		},
	} )

	return { main, other }
}

/**
 |
 | One palette colour, from the handful of values a design actually gives.
 |
 | Both of the event's palettes follow one pattern, so the pattern is written
 | once here: an outline button's border and its text share a value at each
 | state, and a solid button's fill runs through the three states while its
 | border does too — except under a pointer, where the border may hold a
 | value of its own. On the 2027 sheet that is the pressed value for every
 | colour but the theme.
 |
 */
function palette_colour (
	{ rest, hover, pressed, solid_border_hover = pressed }: {
		rest: string
		hover: string
		pressed: string
		solid_border_hover?: string
	},
) {
	return {
		base__color: rest,
		outline_button_border__active__color: pressed,
		outline_button_border__color: rest,
		outline_button_border__hover__color: hover,
		outline_button_text__active__color: pressed,
		outline_button_text__color: rest,
		outline_button_text__hover__color: hover,
		solid_button_border__active__color: pressed,
		solid_button_border__color: rest,
		solid_button_border__hover__color: solid_border_hover,
		solid_button_fill__active__color: pressed,
		solid_button_fill__color: rest,
		solid_button_fill__hover__color: hover,
	}
}

/**
 |
 | The design gives no outline values for the theme, so it copies the
 | conversation's, which is drawn in the same blue. The theme is also the one
 | palette colour whose solid border darkens to the hover value under a pointer
 | rather than to the pressed one.
 |
 */
const PALETTE_2027 = {
	contributor: palette_colour( {
		hover: "#D63700",
		pressed: "#FF4A0A",
		rest: "#FF5C23",
	} ),
	conversation: palette_colour( {
		hover: "#003999",
		pressed: "#004BCC",
		rest: "#0055E6",
	} ),
	experience: palette_colour( {
		hover: "#009478",
		pressed: "#00C7A1",
		rest: "#00E1B6",
	} ),
	showcase: palette_colour( {
		hover: "#D02510",
		pressed: "#EE3B25",
		rest: "#F0503D",
	} ),
	theme: palette_colour( {
		hover: "#003999",
		pressed: "#004BCC",
		rest: "#0055E6",
		solid_border_hover: "#003999",
	} ),
	workshop: palette_colour( {
		hover: "#C89104",
		pressed: "#F9B506",
		rest: "#FABC1D",
	} ),
}

/**
 |
 | One lightness and one chroma across all six, in OKLCH, with only the hue
 | moving — so no colour in the palette shouts over another. Rest is L 0.55,
 | hover the darkest at L 0.47 and pressed between them at L 0.51, the order
 | 2027 keeps. White text clears 4.5:1 on every value.
 |
 */
const PALETTE_2029 = {
	contributor: palette_colour( {
		hover: "#6F4B77",
		pressed: "#7A5783",
		rest: "#86628F",
	} ),
	conversation: palette_colour( {
		hover: "#0B6677",
		pressed: "#1F7183",
		rest: "#2E7D8F",
	} ),
	experience: palette_colour( {
		hover: "#3C673E",
		pressed: "#487249",
		rest: "#537E54",
	} ),
	showcase: palette_colour( {
		hover: "#824844",
		pressed: "#8E534F",
		rest: "#9B5F5A",
	} ),
	theme: palette_colour( {
		hover: "#455A88",
		pressed: "#4F6594",
		rest: "#5B71A1",
	} ),
	workshop: palette_colour( {
		hover: "#755421",
		pressed: "#815F2D",
		rest: "#8D6B39",
	} ),
}
