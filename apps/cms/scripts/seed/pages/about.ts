
/**
 |
 | The About page.
 |
 | The longest hand-written page in the seed, and the one that carries a leaf
 | of the catalogue that nothing else does — the lone image, the lone
 | responsive image, the map composite, the profile list and the **curated**
 | half of the contributor listing. Every one of those is reachable in the
 | admin either way; seeding them here is what gives each a page to be looked
 | at on.
 |
 */

import {
	full_bleed_image_block,
	gallery,
	google_map,
	heading,
	heading_component,
	image,
	image_block,
	plain_string,
	quote,
	responsive_image_block,
	section,
	vanilla_carousel,
	wysiwyg,
} from "../lib/components.ts"
import { contributor_listing } from "../lib/listings.ts"
import { IMAGES, INSTAGRAM_SLIDES, TEAM } from "../lib/media.ts"
import { create_entry } from "../lib/strapi.ts"
import type { Strapi } from "../lib/strapi.ts"
import type { Seeded_Contributors } from "../contributors.ts"
import type { Seeded_Page_Shells } from "../page-shells.ts"

export async function write_about_page (
	strapi: Strapi,
	page_shells: Seeded_Page_Shells,
	contributors: Seeded_Contributors,
) {
	await create_entry( strapi, "api::page.page", {
		main_region: [
			section( "About Conscious Collective", {
				heading: heading_component(
					"About Conscious Collective",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"At Conscious Collective, an initiative by Godrej Design Lab, we seek to bring together professionals from the industry to celebrate this conscious future.",
					"Our objective is to bring together like-minded professionals who will reimagine a more sustainable future and act as ambassadors to explore possibilities of a world that is much healthier and greener for us and for our future generations.",
				],
			} ),
			section( "A Godrej Design Lab Initiative", {
				heading: heading_component(
					"A Godrej Design Lab Initiative",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"Godrej Design Lab is an initiative of Godrej Enterprise Group to encourage and advance design excellence and exploration. It is our way to reach out and collaborate on multiple fronts with the ever growing Indian design ecosystem.",
					"Since 2015, we have worked with talented individuals, firms, and organizations to explore how design can innovate and impact, making pioneering strides in the areas of product and architectural design, material development and social impact.",
				],
			} ),
			section( "About Godrej Design Lab", {
				blocks: [
					{
						__component: "container.image-and-content-v1",
						content: [
							heading( "A word from the Director", "h3" ),
							wysiwyg( [
								"Godrej Design Lab is an initiative of Godrej Enterprises Group to encourage and advance design excellence and exploration.",
								"Since 2015, we have worked with talented individuals, firms and organisations to explore how design can innovate and impact.",
							] ),
						],
						image: image( {
							alt: "Nyrika Holkar",
							caption:
								"highlights the role of curiosity, conscious choices, and the power of design to shape a better tomorrow.",
							title:
								"Nyrika Holkar, Executive Director, Godrej Enterprises Group",
							url: IMAGES.portrait_two,
						} ),
						layout: "image-right",
					},
					quote(
						"A life spent making mistakes is not only more honorable, but more useful than a life spent doing nothing.",
						"George Bernard Shaw, playwright, critic, polemicist",
						IMAGES.portrait_one,
					),
					gallery( "wide-first", [
						{
							alt: "",
							caption:
								"Debasmita explores the push and pull between age-old practices and modern dreams.",
							title: "Living with the Land",
							url: IMAGES.gallery_one,
						},
						{
							alt: "",
							caption:
								"Native cotton, and the people who still grow it.",
							title: "Reweaving the Ecosystem",
							url: IMAGES.gallery_two,
						},
					] ),
				],
				heading: heading_component(
					"About Godrej Design Lab",
					"h2",
				),
				horizontal_rule: true,
				opening_line:
					"How the Lab supports Conscious Collective, and who is behind it.",
				register_with_toc: true,
			} ),
			// The three media leaves that no composite carries for them: an
			// image on its own, a responsive image on its own, and the
			// full-bleed image. All three are in the catalogue and the first
			// two were reachable only through a container until they were
			// seeded here, so none had a page to be looked at on.
			//
			// The full-bleed one is here rather than only on the home page
			// because this is a **two-column** page, which is the arrangement
			// where breaking out means something other than reaching the
			// window: it comes out of the main column's own inset on the left
			// and across the white box's two gutters on the right. It asks for
			// spacing above and none below, so it closes the section flush
			// against the next one.
			section( "Inside the Lab", {
				blocks: [
					image_block( {
						alt: "The Lab's workshop floor, mid-build",
						caption:
							"Photographed on the last afternoon before the 2024 edition opened.",
						title: "The workshop floor",
						url: IMAGES.gallery_two,
					} ),
					responsive_image_block( {
						alt: "The courtyard the event is built around",
						caption:
							"Cropped tall on a phone, landscape from 1024 pixels and letterboxed from 1440 — the same courtyard, framed for the space it lands in.",
						large: IMAGES.art_direction_large,
						medium: IMAGES.art_direction_medium,
						small: IMAGES.art_direction_small,
						title: "The courtyard",
					} ),
					full_bleed_image_block( {
						alt: "The grounds, seen from the water tower",
						caption:
							"Drawn to the edges of the column rather than to the words beside it. This caption is read out rather than shown.",
						large: IMAGES.gallery_one,
						medium: IMAGES.gallery_one,
						small: IMAGES.gallery_two,
						title: "The grounds",
					}, "above" ),
				],
				heading: heading_component( "Inside the Lab", "h2" ),
				opening_line:
					"Where the work is made, and where it is shown.",
				register_with_toc: true,
			} ),
			section( "The Core Team", {
				blocks: [
					{
						__component: "list.profile-list-v1",
						profiles: TEAM.map( ( person ) => ( {
							description: person.description,
							image: image( {
								alt: person.name,
								url: person.image,
							} ),
							name: person.name,
							role: person.role,
						} ) ),
					},
				],
				heading: heading_component( "The Core Team", "h2" ),
				horizontal_rule: true,
				register_with_toc: true,
			} ),
			section( "Location", {
				blocks: [
					{
						__component: "container.map-and-content-v1",
						content: [
							plain_string(
								"Please arrive prepared for a grand buffet at the offsite location.",
							),
						],
						layout: "map-left",
						map: google_map( {
							address:
								"Plant 13, Godrej Enterprises Group\nPirojshanagar, Vikhroli, Mumbai 400079",
							image_url: IMAGES.sketch_map,
							label: "View on Maps",
							map_url: "https://example.com/maps/plant-13",
						} ),
					},
					{
						__component: "miscellaneous.horizontal-rule-v1",
						shade: "light",
					},
					vanilla_carousel( INSTAGRAM_SLIDES.slice( 0, 4 ) ),
				],
				heading: heading_component( "Location", "h2" ),
				horizontal_rule: true,
				register_with_toc: true,
			} ),
			// The **curated** half of the contributor listing: three people,
			// named, in an order somebody chose. The home page's is the same
			// component with the relation left empty.
			section( "Who is behind it", {
				blocks: [
					contributor_listing( "natural", 10, [
						contributors.arthur,
						contributors.debasmita,
						contributors.kaveri,
					] ),
				],
				heading: heading_component( "Who is behind it", "h2" ),
				register_with_toc: true,
			} ),
			// Deliberately not registered with the table of contents, so that
			// the opt-in is observable rather than assumed.
			section( "Colophon", {
				register_with_toc: false,
				strings: [
					"This page came from a database.",
				],
			} ),
		],
		page_shell: page_shells.primary.documentId,
		side_region: [
			plain_string( "Godrej Design Lab, since 2015." ),
		],
		title: "About",
	} )
}
