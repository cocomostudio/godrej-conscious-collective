
/**
 |
 | Contributors.
 |
 | Six people, each with a page of the CMS's simplest publishable content type.
 | Draft-and-publish is off on the schema, so every one of them is live at its
 | URL the moment it is written — see decision record 00002 for why.
 |
 | Each contributor is created here without any `events`. The relation is
 | hidden, read-only and maintained by `derive_contributor_events`, which fills
 | it in when the sessions attach these contributors on publish.
 |
 */

import { image } from "./lib/components.ts"
import { IMAGES } from "./lib/media.ts"
import type { Strapi } from "./lib/strapi.ts"
import type { Seeded_Page_Shells } from "./page-shells.ts"
export type Seeded_Contributors = {
	debasmita: any
	arthur: any
	priya: any
	rahul: any
	kaveri: any
	iris: any
}

export async function write_contributors (
	strapi: Strapi,
	page_shells: Seeded_Page_Shells,
): Promise<Seeded_Contributors> {
	const shell = page_shells.primary.documentId
	const contributor = strapi.documents( "api::contributor.contributor" )

	const debasmita = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Debasmita Ghosh is an installation artist whose work sits "
					+ "at the edge of craft and climate.",
				"She has spent the last three years working with the Kondh "
					+ "community in Odisha's Rayagada district.",
			),
			image: image( {
				alt: "Debasmita Ghosh",
				url: IMAGES.portrait_one,
			} ),
			name: "Debasmita Ghosh",
			page_shell: shell,
			role: "Installation artist",
		},
	} )

	const arthur = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Arthur Mamou-Mani is a Franco-British architect known for "
					+ "large-scale timber structures that visitors can walk "
					+ "under.",
			),
			image: image( {
				alt: "Arthur Mamou-Mani",
				url: IMAGES.portrait_four,
			} ),
			name: "Arthur Mamou-Mani",
			page_shell: shell,
			role: "Architect",
		},
	} )

	const priya = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Priya Iyer is a workshop facilitator who has taught block "
					+ "printing to two decades of children across Mumbai.",
			),
			image: image( { alt: "Priya Iyer", url: IMAGES.portrait_two } ),
			name: "Priya Iyer",
			page_shell: shell,
			role: "Workshop facilitator",
		},
	} )

	const rahul = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Rahul Verma is an urban ecologist writing about the design "
					+ "choices that decide who a city stays cool for.",
			),
			image: image( {
				alt: "Rahul Verma",
				url: IMAGES.portrait_three,
			} ),
			name: "Rahul Verma",
			page_shell: shell,
			role: "Urban ecologist",
		},
	} )

	// Belongs to the 2029 event's sessions only — so this contributor's
	// events list points at 2029 rather than at 2027.
	const kaveri = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Kaveri Nair is a curator putting the 2029 programme "
					+ "together.",
			),
			image: image( { alt: "Kaveri Nair", url: IMAGES.portrait_one } ),
			name: "Kaveri Nair",
			page_shell: shell,
			role: "Curator",
		},
	} )

	// Only attached to a draft session below. The middleware derives events
	// from **published** sessions only, so this contributor stays eventless
	// and appears in no edition listing — the archival rule the schema asks
	// for, applied to a contributor whose work is not yet announced.
	const iris = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Not announced yet, but has a page to prove it. The events "
					+ "list for this row is empty because the one session "
					+ "that links them is a draft.",
			),
			image: image( { alt: "Iris Han", url: IMAGES.portrait_three } ),
			name: "Iris Han",
			page_shell: shell,
			role: "Guest programmer",
		},
	} )

	return { arthur, debasmita, iris, kaveri, priya, rahul }
}

/**
 |
 | Rich-text paragraphs in Strapi's `blocks` shape. Contributor.blurb is a
 | blocks field, and this is what its value looks like on disk.
 |
 */
function paragraphs ( ...lines: string[] ) {
	return lines.map( ( line ) => ( {
		children: [ { text: line, type: "text" } ],
		type: "paragraph",
	} ) )
}
