
/**
 |
 | The Archives page.
 |
 | Two columns, because the design's is: the back link, the page's own name and
 | the line under it sit in the sidebar, and the timeline fills the main column.
 | All three of those belong to the Page rather than to the listing — the
 | timeline holds past editions and nothing else, the same way every other
 | listing in the catalogue holds rows and nothing else.
 |
 | **Only the newest edition is given snapshots.** The rest carry a name, a
 | year, a description and their three pictures, which is what the timeline
 | itself draws. That is deliberate: an entry with an empty region is the
 | ordinary state of a past edition nobody has written up yet, and the block has
 | to answer for it — no "See Snapshots" button, and no dialog to open. Seeding
 | every entry with content would leave that branch unseeded.
 |
 | The snapshots that *are* here follow the static site's eight sections in
 | order, because that is the sequence the slide gate was designed around: a
 | title block, then pictures and words alternating, then a quotation to close.
 | Each one is a slide of its own on a large, tall screen.
 |
 */

import {
	gallery,
	image,
	quote,
	responsive_image_block,
	section,
	wysiwyg,
} from "../lib/components.ts"
import { archive_timeline_listing } from "../lib/listings.ts"
import { ARCHIVE_ENTRIES } from "../lib/media.ts"
import { create_entry } from "../lib/strapi.ts"
import type { Strapi } from "../lib/strapi.ts"
import type { Seeded_Page_Shells } from "../page-shells.ts"

/**
 |
 | A WYSIWYG opening with a heading.
 |
 | The archive entry list holds no heading component — every member of it has to
 | stand alone as a slide, and a lone heading is not one — so a slide that opens
 | with a title says so inside its own rich text. That is the WYSIWYG's job
 | anyway: the editor's level picks how large it looks, and its rank in the
 | document follows from how deeply it sits.
 |
 */
function titled_wysiwyg (
	title: string,
	level: number,
	paragraphs: string[],
) {
	const body = wysiwyg( paragraphs )

	return {
		...body,
		rich_text: [
			{
				children: [ { text: title, type: "text" } ],
				level,
				type: "heading",
			},
			...body.rich_text,
		],
	}
}

const SNAPSHOTS = [
	titled_wysiwyg( "Reclaiming Cool", 2, [
		"Over three days, this event brought together designers, architects, "
		+ "artists, and thinkers to explore how creative practice can "
		+ "respond to the climate crisis. Through a dynamic programme of "
		+ "talks, art installations, and hands-on workshops, the event "
		+ "created space for ideas that challenge extractive systems, "
		+ "reimagine our built environments, and place care, ecology, and "
		+ "resilience at the centre of design.",
		"Moving between conversation and making, the programme invited "
		+ "participants to learn from diverse perspectives and "
		+ "experimental practices. By connecting theory with tangible "
		+ "action, the event aimed to spark collaboration, inspire new "
		+ "approaches, and highlight the role of design, architecture, "
		+ "and art in shaping more just and climate-responsive futures.",
	] ),
	responsive_image_block( {
		alt: "",
		caption:
			"Sound waves do not bounce off these walls, keeping the chamber "
			+ "cool and echo-less.",
		small:
			"https://images.unsplash.com/photo-1597738755960-aeab75744b5e?q=80&w=720&auto=format&fit=crop",
	} ),
	{
		__component: "container.image-and-content-v1",
		content: [
			wysiwyg( [
				"It was an honour to host our guest of honour at Conscious "
				+ "Collective 2025.",
				"Their reflections mirrored our ethos: exploring the "
				+ "intersections of conscious living, long-term impact, "
				+ "and the role of thoughtfully designed spaces in "
				+ "shaping behaviour.",
				"From ingenious innovations to spaces created for young "
				+ "readers, every avenue reinforced a larger idea — that "
				+ "climate consciousness, when embedded early and lived "
				+ "intentionally, has the power to shape the future.",
			] ),
		],
		image: image( {
			alt: "",
			url: "https://images.unsplash.com/photo-1486272812091-a9bf3c6376c5?q=80&w=720&auto=format&fit=crop",
		} ),
		layout: "image-left",
	},
	responsive_image_block( {
		alt: "",
		caption:
			"Buildings coloured in ice-cream flavours have been found to draw "
			+ "people towards them.",
		small:
			"https://images.unsplash.com/photo-1710871398930-c2967d93196f?q=80&w=720&auto=format&fit=crop",
	} ),
	{
		__component: "container.image-and-content-v1",
		content: [
			wysiwyg( [
				"The event brought together designers, architects, and "
				+ "artists to explore how creative practice can drive "
				+ "more sustainable ways of living. Through a series of "
				+ "talks, speakers shared ideas on environmentally "
				+ "responsible materials, circular design, and the social "
				+ "role of architecture and art in shaping greener "
				+ "futures. The conversations highlighted the power of "
				+ "creativity as both a problem-solving tool and a "
				+ "catalyst for cultural change.",
			] ),
		],
		image: image( {
			alt: "",
			url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=720&auto=format&fit=crop",
		} ),
		layout: "image-right",
	},
	gallery( "equal", [
		{
			alt: "",
			caption:
				"What people are always surprised to learn is that this rock "
				+ "pyramid was constructed by builder ants.",
			url: "https://images.unsplash.com/photo-1763426294947-9ff31811820a?q=80&w=720&auto=format&fit=crop",
		},
		{
			alt: "",
			caption:
				"No ants were involved in the construction of this, however.",
			url: "https://images.unsplash.com/photo-1739713908506-aff1394c41d9?q=80&w=720&auto=format&fit=crop",
		},
	] ),
	quote(
		"A life spent making mistakes is not only more honourable, but more "
			+ "useful than a life spent doing nothing.",
		"George Bernard Shaw, playwright, critic, polemicist",
	),
]

export async function write_archives_page (
	strapi: Strapi,
	page_shells: Seeded_Page_Shells,
) {
	const entries = ARCHIVE_ENTRIES.map( ( entry, index ) =>
		index === 0 ? { ...entry, content: SNAPSHOTS } : entry
	)

	await create_entry( strapi, "api::page.page", {
		main_region: [
			// No heading on the section: the page's own name is already at
			// the top of the sidebar, and a section headed "Archives" under a
			// page headed "Archives" says it twice. The section's `title` is
			// the editor's label for the row in the admin, which is what that
			// attribute is for.
			//
			// The timeline declines the space above itself: it opens the
			// column, and the count it draws is what a visitor should meet at
			// the top edge.
			section( "The timeline", {
				blocks: [ archive_timeline_listing( entries ) ],
			} ),
		],
		page_layout: "two-column",
		page_shell: page_shells.primary.documentId,
		standfirst:
			"Relive the experience of the Conscious Collective events over "
			+ "the years.",
		title: "Archives",
	} )
}
