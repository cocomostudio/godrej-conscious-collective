
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
 | 2025 is the main one, so its dates and its Register Now button are the site
 | chrome on every page — including the pages belonging to 2027. 2027 exists so
 | that the resolution rule has something to resolve *to*: a page naming it
 | keeps its colours while wearing 2025's chrome, which is the whole shape of
 | the arrangement in one pair of rows.
 |
 | The colours are the static site's inline palette, which is where they were
 | hardcoded before an editor could reach them. The RGB triplets are **not**
 | written here — a middleware derives each one from its colour on save, and
 | writing them by hand would be a second copy of that rule which could disagree
 | with the first.
 |
 */
export async function write_events ( strapi: Strapi ): Promise<Seeded_Events> {
	const main = await strapi.documents( "api::event.event" ).create( {
		data: {
			colour_contributor: "#FF5C23",
			colour_conversation: "#0055E6",
			colour_experience: "#00E1B6",
			colour_showcase: "#F0503D",
			colour_theme: "#0055E6",
			colour_workshop: "#FABC1D",
			date_end: "2025-12-13",
			date_start: "2025-12-11",
			is_archived: false,
			main: true,
			name: "Conscious Collective 2025",
			schedule: await upload_schedule_document(
				strapi,
				"conscious-collective-2025-schedule.pdf",
				"Conscious Collective 2025",
			),
		},
	} )

	const other = await strapi.documents( "api::event.event" ).create( {
		data: {
			colour_contributor: "#7A5CFF",
			colour_conversation: "#1B7F4B",
			colour_experience: "#E8B4A0",
			colour_showcase: "#C2410C",
			colour_theme: "#1B7F4B",
			colour_workshop: "#F59E0B",
			date_end: "2027-12-05",
			date_start: "2027-12-02",
			is_archived: false,
			main: false,
			name: "Conscious Collective 2027",
			schedule: await upload_schedule_document(
				strapi,
				"conscious-collective-2027-schedule.pdf",
				"Conscious Collective 2027",
			),
		},
	} )

	return { main, other }
}
