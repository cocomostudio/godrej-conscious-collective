
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
	link_block,
	plain_string,
	plain_string_component,
	quote,
	responsive_image_block,
	section,
	vanilla_carousel,
	wysiwyg,
	wysiwyg_from_markdown,
} from "../lib/components.ts"
import { contributor_listing } from "../lib/listings.ts"
import { IMAGES, INSTAGRAM_SLIDES, TEAM } from "../lib/media.ts"
import { create_entry } from "../lib/strapi.ts"
import type { Strapi } from "../lib/strapi.ts"
import type { Seeded_Contributors } from "../contributors.ts"
import type { Seeded_Page_Shells } from "../page-shells.ts"

/**
 |
 | Where the event is, as Google Maps writes it into a browser's address bar.
 |
 | Kept whole rather than trimmed to the part that is read. The URL carries the
 | viewport at `@…,72.9200579` and the pin at `!4d72.9226328`, and those are
 | 270 metres apart — so a seed holding only the coordinates would seed content
 | while quietly retiring the one case the reading exists to get right.
 |
 */
const PLANT_13 =
	"https://www.google.com/maps/place/@19.0939921,72.9200579,17z/data=!3m2"
	+ "!4b1!5s0x397878ffde0c8ab3:0x8b5bde3d4ef844a4!4m6!3m5"
	+ "!1s0x3be7c752aef03905:0x95914985cbca39c8!8m2!3d19.0939921!4d72.9226328"
	+ "!16s%2Fg%2F11hhrs35dw"

/**
 |
 | The Location section, as one passage.
 |
 | The GCC site's shape with this repository's own content: a heading, a line
 | about what to expect, the address on its own lines, and — as a component
 | beside this block rather than inside it — the button to Maps.
 |
 | **The heading is inside the text rather than on the section**, at the size
 | the GCC site draws it. The section keeps its title and its place in the table
 | of contents, so the entry survives and its anchor lands on the section rather
 | than on a heading part-way down it.
 |
 | The address is one paragraph with a newline in it, which is a hard break.
 |
 */
const LOCATION = `
### Location

Please arrive prepared for a grand buffet at the offsite location.

Plant 13, Pirojshanagar
Vikhroli, Mumbai 400079
`

/**
 |
 | The same map beside words of three lengths, so each way the words can sit
 | against the map has a page to be looked at on.
 |
 | The lengths are judged at 1440 pixels wide, where the words beside the map
 | run about 440 pixels across and the map is 330 pixels tall. From the medium
 | breakpoint up to that width the words are narrower, so every passage runs
 | taller there.
 |
 | - Shorter than the map: the block must end at the map, not 32px past it.
 | - About as tall as the map: the edge case between the other two.
 | - Taller than the map: the words wrap underneath it, 32px clear of it.
 |
 */
const AROUND_PLANT_13 = {
	shorter: [
		"Plant 13 stands on the Godrej campus at Pirojshanagar, in Vikhroli.",
		"The nearest station is Vikhroli, on the Central line, a short ride away.",
	],
	about_as_tall: [
		"Pirojshanagar is the township the Godrej family built in Vikhroli, in the eastern suburbs of Mumbai. It is named after Pirojsha Godrej, who bought the land in the 1940s, when the city had not yet grown out this far.",
		"The township was planned as a place to live as well as to work. Factories sit beside housing, schools and gardens, and the plant buildings that give the campus its shape are known by their numbers. Plant 13 is one of them.",
		"The nearest station is Vikhroli, on the Central line, and the campus is a short ride from there. Allow extra time on a weekday morning, when the roads out of the station are at their busiest.",
	],
	taller: [
		"Pirojshanagar is the township the Godrej family built in Vikhroli, in the eastern suburbs of Mumbai. It is named after Pirojsha Godrej, who bought the land in the 1940s, when the city had not yet grown out this far.",
		"The township was planned as a place to live as well as to work. Factories sit beside housing, schools and gardens, and the plant buildings that give the campus its shape are known by their numbers. Plant 13 is one of them.",
		"East of the campus, a wide belt of mangroves runs along the Thane Creek. The family has protected it for decades, and it is one of the largest stretches of mangrove left in the city.",
		"The mangroves hold the shoreline together, shelter young fish and draw migratory birds in the winter months. A marine ecology centre on the campus studies them, and it takes visitors along the creek on guided walks.",
		"The nearest station is Vikhroli, on the Central line, and the campus is a short ride from there. Allow extra time on a weekday morning, when the roads out of the station are at their busiest.",
	],
}

function map_beside ( layout: "map-left" | "map-right", paragraphs: string[] ) {
	return {
		__component: "container.map-and-content-v1",
		content: [ wysiwyg( paragraphs ) ],
		layout,
		map: google_map( { place_url: PLANT_13 } ),
	}
}

/**
 |
 | One section per length, with the map on the left and then on the right. A
 | rule sits between the two, because a rule is what an editor would put there,
 | and the gap on either side of a rule is its own.
 |
 */
function map_beside_both_ways ( title: string, paragraphs: string[] ) {
	return section( title, {
		blocks: [
			map_beside( "map-left", paragraphs ),
			{
				__component: "miscellaneous.horizontal-rule-v1",
				shade: "light",
			},
			map_beside( "map-right", paragraphs ),
		],
		heading: heading_component( title, "h2" ),
		register_with_toc: true,
	} )
}

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
				opening_line: plain_string_component(
					"How the Lab supports Conscious Collective, and who is behind it.",
				),
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
				opening_line: plain_string_component(
					"Where the work is made, and where it is shown.",
				),
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
							wysiwyg_from_markdown( LOCATION ),
							link_block(
								"View on Maps",
								PLANT_13,
								"button",
							),
						],
						layout: "map-left",
						// No picture, so this is the branch that embeds an
						// actual Google Map. The other branch — a drawing, and
						// no third-party request — is the one the component
						// prefers, and it is left to an editor with a drawing
						// to give it.
						map: google_map( { place_url: PLANT_13 } ),
					},
					{
						__component: "miscellaneous.horizontal-rule-v1",
						shade: "light",
					},
					vanilla_carousel(
						INSTAGRAM_SLIDES.concat(
							INSTAGRAM_SLIDES,
							INSTAGRAM_SLIDES,
						),
					),
				],
				// No heading of its own: this section's heading is inside the
				// text block, which is what makes the passage read as one. The
				// title and the opt-in stay, so the table of contents keeps its
				// entry and points it at the section — see `LOCATION` above.
				horizontal_rule: true,
				register_with_toc: true,
			} ),
			map_beside_both_ways(
				"Getting to Plant 13",
				AROUND_PLANT_13.shorter,
			),
			map_beside_both_ways(
				"Pirojshanagar",
				AROUND_PLANT_13.about_as_tall,
			),
			map_beside_both_ways(
				"The campus and the creek",
				AROUND_PLANT_13.taller,
			),
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
					"That is all there is to know.",
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
