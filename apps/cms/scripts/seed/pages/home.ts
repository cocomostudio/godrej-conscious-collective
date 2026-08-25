
/**
 |
 | The home page.
 |
 | It resolves to `/home` — every URL in this CMS is derived from the entry's
 | own title, so nothing resolves to `/` — and the website falls back to it
 | when `/` resolves to nothing. See `url-patterns.ts`.
 |
 | It is one page rather than a template: the carousels, the ticker, the
 | Instagram strip and the sponsors are all ordinary sections holding ordinary
 | catalogue components, and an editor can reorder or remove any of them.
 |
 */

import {
	heading,
	heading_component,
	image,
	image_link,
	link,
	marquee,
	plain_string,
	responsive_image,
	responsive_image_block,
	section,
} from "../lib/components.ts"
import {
	contributor_listing,
	session_listing,
} from "../lib/listings.ts"
import { IMAGES, INSTAGRAM_SLIDES, SPONSORS } from "../lib/media.ts"
import { create_entry } from "../lib/strapi.ts"
import type { Strapi } from "../lib/strapi.ts"
import type { Seeded_Page_Shells } from "../page-shells.ts"

export async function write_home_page (
	strapi: Strapi,
	page_shells: Seeded_Page_Shells,
) {
	// "Home" resolves to `/home`, and the website falls back to it when `/`
	// resolves to nothing. `/home` itself redirects permanently to `/`.
	//
	// One column, because the home page is the one the static site draws
	// full-width: the category carousels, the ticker, the Instagram strip and
	// the sponsors all run off both edges, and there is no back link or table
	// of contents to put in a sidebar.
	await create_entry( strapi, "api::page.page", {
		main_region: [
			// The Above-the-Fold image is the home page's opening frame in
			// the static site — one photograph across three widths, portrait
			// on a phone and landscape from the medium breakpoint. The
			// responsive-image block does not (yet) render truly full-bleed
			// here, so the block sits inside its section container; the
			// intent is preserved, and a full-width rendering can be added
			// to the block later without touching the seed.
			section( "Above the Fold", {
				blocks: [
					responsive_image_block( {
						alt: "Conscious Collective at Plant 13",
						small: IMAGES.promo_small,
						medium: IMAGES.promo_medium,
					} ),
				],
				register_with_toc: false,
				spacing_around: "none",
			} ),
			// The marquee, the image stack, the Instagram strip and the
			// sponsors are the home page's own furniture in the static site.
			// They are seeded here so that every one of them has a page to be
			// looked at on.
			section( "Practicalities", {
				blocks: [
					marquee( [
						"Plant 13, Godrej Enterprises Group, Pirojshanagar, Vikhroli, Mumbai 400079",
						"11 - 13 Dec 2025",
						"9:00 AM - 10:00 PM",
					] ),
				],
				register_with_toc: false,
			} ),
			section( "Reclaiming Cool", {
				background_gradient: "white-to-light",
				background_pattern: "spider-web-1",
				background_position: "left",
				blocks: [
					{
						__component:
							"container.image-stack-and-content-v1",
						content: [
							heading( "Reclaiming Cool", "h1" ),
							plain_string(
								"Our theme for Conscious Collective 2025 is a movement for heat-resilient design, equitable futures, and climate-responsive living.",
							),
							plain_string(
								"As temperatures rise and cities become heat traps, “cool” is no longer a comfort, it’s a right.",
							),
						],
						images: [
							responsive_image( {
								alt: "A workshop in progress",
								url: IMAGES.stack_one,
							} ),
							responsive_image( {
								alt: "An installation being built",
								url: IMAGES.stack_two,
							} ),
							responsive_image( {
								alt: "Visitors at a showcase",
								url: IMAGES.stack_three,
							} ),
						],
						layout: "images-left",
					},
				],
				register_with_toc: true,
			} ),
			// The four category carousels, and the collaborators ring
			// beneath them. Every one of these holds a category and a count and
			// no rows at all: the CMS fills them from the event the page
			// resolves to, when the page is asked for.
			//
			// The heading, the opening line and the "View All" link belong to
			// the **section**, which already carries all three. A listing that
			// held its own would be a second place for a heading to live.
			section( "Showcases", {
				background_gradient: "showcase-to-light",
				blocks: [ session_listing( "Showcase", 6 ) ],
				heading: heading_component( "Showcases", "h2" ),
				link: link( "View All", "/showcases" ),
				opening_line:
					"Installations and concept designs, sited across the "
					+ "grounds for all three days.",
				register_with_toc: true,
			} ),
			section( "Experiences", {
				background_gradient: "light",
				blocks: [ session_listing( "Experience", 3 ) ],
				heading: heading_component( "Experiences", "h2" ),
				link: link( "View All", "/experiences" ),
				opening_line:
					"Things to walk through, touch and take part in.",
				register_with_toc: true,
			} ),
			section( "Conversations", {
				background_gradient: "conversation-to-light",
				background_pattern: "spider-web-2",
				background_position: "bottom-right",
				blocks: [ session_listing( "Conversation", 5 ) ],
				heading: heading_component( "Conversations", "h2" ),
				link: link( "View All", "/conversations" ),
				opening_line:
					"Talks and panels with the people making the work.",
				register_with_toc: true,
			} ),
			section( "Workshops", {
				background_gradient: "light",
				blocks: [ session_listing( "Workshop", 4 ) ],
				heading: heading_component( "Workshops", "h2" ),
				link: link( "View All", "/workshops" ),
				opening_line: "Hands-on sessions, with places to book.",
				register_with_toc: true,
			} ),
			// Left empty on purpose, so that the home page is the automatic
			// half of the contributor listing and the About page below is the
			// curated half.
			section( "Collaborators", {
				background_gradient: "collaborator-to-light",
				background_pattern: "spider-web-3",
				background_position: "left",
				blocks: [ contributor_listing( "carousel", 10 ) ],
				heading: heading_component( "Collaborators", "h2" ),
				link: link( "View All", "/collaborators" ),
				opening_line:
					"The people who made this year\u2019s programme.",
				register_with_toc: true,
			} ),
			section( "Follow our Instagram", {
				background_gradient: "conversation-to-light",
				blocks: [
					{
						__component: "media.instagram-feed-v1",
						slides: INSTAGRAM_SLIDES.map( ( slide ) =>
							image_link(
								slide.url,
								slide.label,
								slide.image,
							)
						),
					},
				],
				register_with_toc: false,
			} ),
			section( "Sponsors", {
				background_gradient: "light",
				blocks: [
					{
						__component: "list.sponsors-list-v1",
						sponsors: SPONSORS.map( ( sponsor ) => ( {
							image: image( {
								alt: sponsor.name,
								url: sponsor.url,
							} ),
							name: sponsor.name,
						} ) ),
					},
				],
				horizontal_rule: true,
				register_with_toc: false,
			} ),
		],
		page_layout: "one-column",
		page_shell: page_shells.primary.documentId,
		// Written even though a one-column page renders none of it, so that
		// switching this page back to two columns shows something in the
		// sidebar rather than an empty one.
		side_region: [
			heading( "Getting here", "h4" ),
			plain_string( "Godrej One, Vikhroli East, Mumbai." ),
		],
		standfirst:
			"Design patrons from Mumbai and beyond, celebrating the possibility "
			+ "of a conscious future.",
		title: "Home",
	} )
}
