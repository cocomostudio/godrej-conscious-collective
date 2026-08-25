
/**
 |
 | The bodies the sessions are given to read.
 |
 | A session's own attributes carry what it *is* — the name, the times, the
 | price. What fills the page below that is an ordinary main region, written by
 | an editor out of the same catalogue every other page uses, and these five
 | templates are what that looks like when somebody has done it well.
 |
 | They are dealt round-robin across the whole programme by `sessions.ts`, so
 | that no two neighbouring sessions read alike.
 |
 */

import {
	gallery,
	heading,
	heading_component,
	image,
	plain_string,
	plain_string_component,
	quote,
	section,
	vanilla_carousel,
	wysiwyg,
} from "./components.ts"
import { IMAGES, INSTAGRAM_SLIDES } from "./media.ts"

/**
 |
 | The five sample content templates round-robin-assigned to every session.
 |
 | Each returns a fresh main-region array — a function rather than a value,
 | so that Strapi never sees the same object twice and edits to one entry
 | cannot leak into another.
 |
 | Between them the five cover the catalogue's blocks a session commonly
 | wants: plain strings and wysiwyg for prose, gallery in both layouts,
 | image blocks, the image-and-content composite, quote, horizontal rule
 | and the vanilla carousel. The order and the mix vary: a session's page
 | that follows a different template reads visibly different from its
 | neighbours.
 |
 */
export const sample_content_templates: Array<() => any[]> = [
	// A: Story-led — prose, then an equal-layout gallery, then a quote.
	() => [
		section( "About the Work", {
			heading: heading_component( "About the Work", "h2" ),
			opening_line: plain_string_component(
				"The making, the material and the reasons behind it.",
			),
			register_with_toc: true,
			strings: [
				"This piece began in conversation — long, unhurried and often circling back to the same three questions. What is worth keeping? What must change? What can be built with the little that is left?",
				"Every element on show is an answer to one of those questions, offered by the people whose lives sit closest to it.",
			],
			blocks: [
				gallery( "equal", [
					{
						alt: "",
						caption:
							"The studio on the first morning of the build.",
						title: "Day one in the studio",
						url: IMAGES.gallery_one,
					},
					{
						alt: "",
						caption:
							"A dry run, the day before the doors opened.",
						title: "Opening rehearsal",
						url: IMAGES.gallery_two,
					},
				] ),
			],
		} ),
		section( "In Their Words", {
			heading: heading_component( "In Their Words", "h2" ),
			register_with_toc: true,
			blocks: [
				quote(
					"Materials remember. That is why we chose the ones we chose, and left the ones we left.",
					"The lead maker, in interview",
				),
			],
		} ),
	],

	// B: Programme + a vanilla carousel from the studio.
	() => [
		section( "What Happens", {
			heading: heading_component( "What Happens", "h2" ),
			opening_line: plain_string_component(
				"The shape of the session, from arrival to close.",
			),
			register_with_toc: true,
			strings: [
				"The doors open twenty minutes before the start. Anything you need is at the desk on the way in, and there is somewhere to leave a bag if you have one.",
				"Please stay for the last ten minutes — that is where the questions land, and where the parts you missed most often come back around.",
			],
		} ),
		section( "Moments From the Studio", {
			heading: heading_component( "Moments From the Studio", "h2" ),
			register_with_toc: true,
			blocks: [
				vanilla_carousel( INSTAGRAM_SLIDES.slice( 0, 4 ) ),
			],
		} ),
	],

	// C: Editorial with an image-and-content composite.
	() => [
		section( "Behind the Making", {
			heading: heading_component( "Behind the Making", "h2" ),
			opening_line: plain_string_component(
				"The people, the place, and what led here.",
			),
			register_with_toc: true,
			blocks: [
				{
					__component: "container.image-and-content-v1",
					content: [
						heading( "On method", "h3" ),
						wysiwyg( [
							"The method is old, the questions it is being asked are new. That is the whole shape of the work on show.",
							"This section walks through both, side by side, so that a visitor can see where the technique leaves off and where the questions begin.",
						] ),
						plain_string(
							"The result is a piece that fits its site without asking anything of it.",
						),
					],
					image: image( {
						alt: "The maker at work, mid-build",
						caption:
							"Photographed the week before the opening, on a day the light was kind.",
						title: "In the studio",
						url: IMAGES.stack_two,
					} ),
					layout: "image-left",
				},
			],
		} ),
	],

	// D: Deep-dive read with a wide-first gallery.
	() => [
		section( "A Longer Read", {
			heading: heading_component( "A Longer Read", "h2" ),
			opening_line: plain_string_component(
				"The context you might want before you come, or after you leave.",
			),
			register_with_toc: true,
			blocks: [
				wysiwyg( [
					"The work sits inside a longer conversation about what we owe the places we build in, and to whom the answer is finally addressed.",
					"That conversation started elsewhere, and it will carry on after this event is over. What you see here is one participant's contribution to it — offered in the hope that a good question can be asked twice, in two different rooms, without either room agreeing on the answer.",
					"The reading below is what the makers were working from while the piece took shape. It is offered as a way in, not as required reading.",
				] ),
			],
		} ),
		section( "Sightlines", {
			heading: heading_component( "Sightlines", "h2" ),
			register_with_toc: true,
			blocks: [
				gallery( "wide-first", [
					{
						alt: "",
						caption:
							"The view walking in from the west entrance.",
						title: "The approach",
						url: IMAGES.stack_one,
					},
					{
						alt: "",
						caption:
							"Looking back from the far end of the piece.",
						title: "Looking back",
						url: IMAGES.stack_three,
					},
				] ),
			],
		} ),
	],

	// E: Practicalities + a wider vanilla carousel.
	() => [
		section( "Practicalities", {
			heading: heading_component( "Practicalities", "h2" ),
			horizontal_rule: true,
			register_with_toc: true,
			strings: [
				"There is nothing to book beyond the ticket, and nothing to bring.",
				"If you have accessibility needs, please write to the event team ahead of your visit — the access team can arrange most things given a day's notice.",
			],
		} ),
		section( "Visual Journey", {
			heading: heading_component( "Visual Journey", "h2" ),
			register_with_toc: true,
			blocks: [
				vanilla_carousel( INSTAGRAM_SLIDES ),
			],
		} ),
	],
]
