
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
	full_bleed_image_block,
	heading,
	heading_component,
	image,
	image_link,
	link,
	marquee,
	plain_string,
	plain_string_component,
	responsive_image,
	section,
} from "../lib/components.ts"
import {
	archive_carousel_listing,
	contributor_listing,
	session_listing,
} from "../lib/listings.ts"
import {
	ARCHIVE_SLIDES,
	IMAGES,
	INSTAGRAM_SLIDES,
	SPONSORS,
} from "../lib/media.ts"
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
			// on a phone and landscape from the medium breakpoint. It is the
			// full-bleed block now that there is one: on a one-column page
			// that takes it out of the section's container and to the two
			// edges of the window, which is what the static site draws and
			// what the responsive-image block here could not do.
			section( "Above the Fold", {
				blocks: [
					full_bleed_image_block( {
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
			//
			// The ticker asks for no spacing at either edge — the black bar
			// butts straight against what sits above and below it. Said here
			// rather than built into the block, so a ticker that does want
			// air can have it.
			section( "Practicalities", {
				blocks: [
					marquee( [
						"Plant 13, Godrej Enterprises Group, Pirojshanagar, Vikhroli, Mumbai 400079",
						"11 - 13 Dec 2027",
						"9:00 AM - 10:00 PM",
					], "none" ),
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
								"Our theme for Conscious Collective 2027 is a movement for heat-resilient design, equitable futures, and climate-responsive living.",
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
			//
			// The colour of the words is said on the heading and the link
			// rather than on the section, so it travels with the words and
			// not with the background they happen to sit on.
			section( "Showcases", {
				background_gradient: "showcase-to-light",
				blocks: [ session_listing( "Showcase", 6 ) ],
				heading: heading_component(
					"Showcases",
					"h1",
					false,
					"white",
				),
				link: link( "View All", "/showcases", "plain", "white" ),
				opening_line: plain_string_component(
					"Installations and concept designs, sited across the "
						+ "grounds for all three days.",
					"white",
				),
				register_with_toc: true,
			} ),
			section( "Experiences", {
				background_gradient: "light",
				// The rows seeded onto the other treatment, so that both
				// branches of `style_and_transition` are on a page somebody
				// can look at rather than only one of them.
				blocks: [
					session_listing(
						"Experience",
						3,
						"change-fill-on-hover",
					),
				],
				heading: heading_component(
					"Experiences",
					"h1",
					false,
					"black",
				),
				link: link( "View All", "/experiences", "plain", "black" ),
				opening_line: plain_string_component(
					"Things to walk through, touch and take part in.",
				),
				register_with_toc: true,
			} ),
			section( "Conversations", {
				background_gradient: "conversation-to-light",
				background_pattern: "spider-web-2",
				background_position: "bottom-right",
				blocks: [
					session_listing( "Conversation", 5 ),
				],
				heading: heading_component(
					"Conversations",
					"h1",
					false,
					"white",
				),
				link: link( "View All", "/conversations", "plain", "white" ),
				opening_line: plain_string_component(
					"Talks and panels with the people making the work.",
					"white",
				),
				register_with_toc: true,
			} ),
			section( "Workshops", {
				background_gradient: "light",
				blocks: [
					session_listing(
						"Workshop",
						4,
						"change-fill-on-hover",
					),
				],
				heading: heading_component(
					"Workshops",
					"h1",
					false,
					"black",
				),
				link: link( "View All", "/workshops", "plain", "black" ),
				opening_line: plain_string_component(
					"Hands-on sessions, with places to book.",
				),
				register_with_toc: true,
			} ),
			// Left empty on purpose, so that the home page is the automatic
			// half of the contributor listing and the About page below is the
			// curated half.
			section( "Collaborators", {
				background_gradient: "contributor-to-light",
				background_pattern: "spider-web-3",
				background_position: "left",
				blocks: [ contributor_listing( "carousel", 10 ) ],
				heading: heading_component(
					"Collaborators",
					"h1",
					false,
					"white",
				),
				link: link( "View All", "/collaborators", "plain", "white" ),
				opening_line: plain_string_component(
					"The people who made this year\u2019s programme.",
					"white",
				),
				register_with_toc: true,
			} ),
			// The Archives.
			//
			// The heading, the line under it and the View All link are the
			// section's, not the ring's — the ring holds slides and nothing
			// else, which is what makes it the same kind of component as the
			// carousel and the Instagram feed rather than a section that
			// happens to turn.
			//
			// **This ring and the Archives page's timeline are separate
			// content**, and they disagree about how many editions there have
			// been. That is the static site's own state of affairs, kept —
			// see `ARCHIVE_SLIDES`.
			section( "The Archives", {
				background_gradient: "light-to-conversation",
				blocks: [ archive_carousel_listing( ARCHIVE_SLIDES ) ],
				heading: heading_component(
					"The Archives",
					"h1",
					false,
					"black",
				),
				link: link( "View All", "/archives", "plain", "black" ),
				opening_line: plain_string_component(
					"Take a stroll back memory lane.",
				),
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
				heading: heading_component(
					"Follow our Instagram",
					"h1",
					false,
					"white",
				),
				link: link(
					"@godrejdesignlab",
					"https://www.instagram.com/godrejdesignlab",
					"plain",
					"white",
				),
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
				// The strip runs the section's full width and carries its own
				// breathing room, so the page's full opening gap above it
				// reads as a hole rather than as a separation. It closes
				// normally: the gap below is what holds the rule off the
				// footer.
				spacing_around: "below",
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
