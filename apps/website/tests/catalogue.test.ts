
/**
 |
 | The component catalogue, rendered end to end with the CMS stubbed at the
 | fetch boundary.
 |
 | The CMS's own tests hold the shape of what arrives. These hold what the
 | website does with it: that every component in the catalogue reaches a block,
 | that the rules the admin only *states* are actually enforced here, and that
 | the map keeps its promise about third-party requests.
 |
 */

import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
} from "vitest"

import {
	type Website,
	boot_website,
} from "./support/boot-website.ts"
import {
	coloured,
	envelope,
	full_bleed_image_block,
	gallery,
	google_map,
	google_map_block,
	heading,
	horizontal_rule,
	html_document_hooks,
	image_and_content,
	image_block,
	image_link,
	image_stack_and_content,
	instagram_feed,
	link,
	map_and_content,
	marquee,
	page_shell,
	plain_string,
	profile_list,
	quote,
	responsive_image_block,
	script,
	section,
	spaced,
	sponsors_list,
	vanilla_carousel,
	wysiwyg,
	wysiwyg_with_a_heading,
} from "./support/envelopes.ts"

const SLIDES = [
	image_link( "https://example.com/one", "One", "/uploads/one.png" ),
	image_link( "https://example.com/two", "Two", "/uploads/two.png" ),
]

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		"/everything": envelope( {
			main_region: [
				section( "Everything", {
					content: [
						wysiwyg( "A formatted paragraph." ),
						quote(
							"A quotable sentence.",
							"Somebody, somewhere",
							"/uploads/portrait.png",
						),
						marquee( "The venue", "The dates", "The hours" ),
						link( "/about", "A plain link" ),
						link( "/register", "A button link", "button" ),
						image_block( "/uploads/plain.png", {
							caption: "A caption.",
							title: "A title.",
						} ),
						responsive_image_block(
							"/uploads/responsive.png",
						),
						full_bleed_image_block( "/uploads/bled.png", {
							alt: "Edge to edge",
							caption: "A caption nobody sees.",
						} ),
						gallery(
							"wide-first",
							"/uploads/left.png",
							"/uploads/right.png",
						),
						google_map_block( { image: null } ),
						vanilla_carousel( ...SLIDES ),
						instagram_feed( ...SLIDES ),
						sponsors_list( {
							name: "Laika",
							url: "/uploads/laika.svg",
						} ),
						profile_list( {
							description: "Runs the programme.",
							name: "Nandini Rao",
							role: "Programme lead",
						} ),
						horizontal_rule( "dark" ),
						image_and_content( "/uploads/floated.png", [
							plain_string( "Beside the picture." ),
						] ),
						image_stack_and_content(
							[
								"/uploads/a.png",
								"/uploads/b.png",
								"/uploads/c.png",
							],
							[ plain_string( "Beside the stack." ) ],
						),
						map_and_content(
							google_map( {
								image: {
									large: null,
									medium: null,
									small: {
										alt: "A drawn map",
										url: "/uploads/sketch-map.svg",
									},
								},
							} ),
							[ plain_string( "Beside the map." ) ],
						),
					],
					heading: { content: "Everything", level: "h2" },
				} ),
			],
			title: "Everything",
		} ),

		"/backgrounds": envelope( {
			main_region: [
				section( "Filled", {
					background_gradient: "showcase-to-light",
					background_pattern: "spider-web-2",
					background_position: "bottom-right",
					content: [ plain_string( "On a background." ) ],
					horizontal_rule: true,
				} ),
			],
			title: "Backgrounds",
		} ),

		"/cross-field-rules": envelope( {
			main_region: [
				section( "No heading", {
					content: [ plain_string( "The body." ) ],
					link: {
						label: "A link with no heading",
						style: "plain",
						url: "/somewhere",
					},
					opening_line: "This opening line has nothing to open.",
				} ),
				section( "Both links", {
					heading: {
						content: "The heading",
						level: "h2",
						link: {
							label: "The heading's link",
							style: "plain",
							url: "/heading",
						},
					},
					link: {
						label: "The section's link",
						style: "plain",
						url: "/section",
					},
					opening_line:
						"This opening line has a heading above it.",
				} ),
			],
			title: "Cross-field rules",
		} ),

		"/mapped": envelope( {
			main_region: [
				section( "Mapped", {
					content: [
						google_map_block( {
							image: {
								large: null,
								medium: null,
								small: {
									alt: "A drawn map",
									url: "/uploads/sketch-map.svg",
								},
							},
						} ),
					],
				} ),
			],
			title: "Mapped",
		} ),

		// One block per section, so each section's own padding is decided by
		// that one block at both of its edges.
		"/spacing": envelope( {
			main_region: [
				section( "Normal", {
					content: [ marquee( "Spaced both ways" ) ],
				} ),
				section( "Flush", {
					content: [
						spaced( marquee( "Flush both ways" ), "none" ),
					],
				} ),
				section( "Below only", {
					content: [
						spaced( marquee( "Space below only" ), "below" ),
					],
				} ),
				section( "Headed", {
					content: [
						spaced(
							marquee( "Flush, under a heading" ),
							"none",
						),
					],
					heading: { content: "Words at the top", level: "h2" },
				} ),
				// What every entry saved before the attribute existed looks
				// like: the column is there and nobody has written to it.
				section( "Never set", {
					content: [ spaced( marquee( "Saved before" ), null ) ],
				} ),
				section( "The section's own say", {
					content: [ plain_string( "In a section that pads." ) ],
					spacing_around: "above",
				} ),
			],
			title: "Spacing",
		} ),

		"/text-colour": envelope( {
			main_region: [
				section( "Asked for", {
					content: [
						coloured(
							plain_string( "Prose in white" ),
							"white",
						),
						coloured(
							wysiwyg_with_a_heading(
								"Rich heading",
								"Rich prose in white",
							),
							"white",
						),
						coloured( heading( "Heading in black" ), "black" ),
						coloured(
							link( "/asked", "Link in black" ),
							"black",
						),
						coloured(
							link( "/cta", "Button in white", "button" ),
							"white",
						),
					],
				} ),
				// What every entry saved before the attribute existed looks
				// like: the column is there and nobody has written to it.
				section( "Never set", {
					content: [
						coloured(
							plain_string( "Prose saved before" ),
							null,
						),
						coloured(
							heading( "Heading saved before" ),
							null,
						),
						coloured(
							link( "/before", "Link saved before" ),
							null,
						),
					],
				} ),
				section( "The section's own words", {
					content: [ plain_string( "Body" ) ],
					heading: {
						content: "Section heading in white",
						text_color: "white",
					},
					link: {
						label: "Section link in white",
						style: "plain",
						text_color: "white",
						url: "/all",
					},
				} ),
			],
			title: "Text colour",
		} ),

		"/injected": envelope( {
			main_region: [ section( "Injected" ) ],
			title: "Injected",
		}, {
			page_shell: page_shell( {
				arbitrary_code: html_document_hooks( {
					before_body_closing: [
						script( "window.__closing = true" ),
					],
					before_head_closing: [
						script( "window.__head = true" ),
					],
				} ),
			} ),
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("the catalogue", () => {
	it("has a block for every component, so nothing renders as a gap", async () => {
		const { html, status } = await website.get( "/everything" )

		expect( status ).toBe( 200 )
		// The renderer marks an unknown component with a `<template>` and warns.
		// Any one of them here is a component the CMS holds and the website
		// does not.
		expect( html ).not.toContain( "data-unknown-block" )
	})

	it("renders each component's own content", async () => {
		const { html } = await website.get( "/everything" )

		for (
			const expected of [
				"A formatted paragraph.",
				"A quotable sentence.",
				"Somebody, somewhere",
				"The venue",
				"A plain link",
				"A button link",
				"A caption.",
				"Laika",
				"Nandini Rao",
				"Programme lead",
				"Runs the programme.",
				"Beside the picture.",
				"Beside the stack.",
				"Beside the map.",
				"Follow our Instagram",
			]
		) {
			expect( html ).toContain( expected )
		}
	})

	it("resolves a picture the CMS stores against the CMS's own origin", async () => {
		const { html } = await website.get( "/everything" )

		expect( html ).toContain( `src="http://cms.test/uploads/plain.png"` )
	})

	it("leaves an address an editor pasted exactly as it arrived", async () => {
		const { html } = await website.get( "/everything" )

		expect( html ).not.toContain( "http://cms.testhttps://" )
	})
})

describe("a repeatable component list", () => {
	it("is rendered as data rather than walked as a region", async () => {
		const { html } = await website.get( "/everything" )

		// Every item of the marquee is on the page, and none of them went
		// through the renderer as a plain string block would have — a plain
		// string renders as a paragraph, and these are list items.
		expect( html ).toContain( "<li" )
		expect( html ).toContain( "The dates" )
		expect( html ).toContain( "The hours" )
	})
})

describe("the two carousels", () => {
	it("hold the same slides and render differently", async () => {
		const { html } = await website.get( "/everything" )

		// The Instagram feed is a tweened strip under a heading; the vanilla
		// one is a plain scrolling row of links and nothing else.
		expect( html ).toContain( "js_slide__inner" )
		expect( html ).toContain( "scrollbar-none" )
		expect( html ).toContain( "@godrejdesignlab" )
	})
})

describe("a section", () => {
	it("realises its spacing as padding and never as margin", async () => {
		const { html } = await website.get( "/backgrounds" )

		const markup = section_markup( html )

		// A margin between two background-filled sections renders as a strip of
		// nothing between two blocks of colour, so the section and the box it
		// pads with carry padding and no margin at all.
		expect( markup ).toMatch( /\bp[tby]-/ )
		expect( markup ).not.toMatch( /(?:^|["\s])-?m[trblxye]?-/ )
	})

	it("carries its background as one composed image", async () => {
		const { html } = await website.get( "/backgrounds" )

		expect( html ).toContain( "spider-web-pattern-2.svg" )
		expect( html ).toContain( "--ctx-showcase-color" )
	})

	it("draws its rule above itself when asked", async () => {
		const { html } = await website.get( "/backgrounds" )

		expect( html ).toContain( "border-t-2" )
	})

	it("does not render an opening line with no heading above it", async () => {
		const markup = rendered(
			( await website.get( "/cross-field-rules" ) ).html,
		)

		expect( markup ).not.toContain(
			"This opening line has nothing to open.",
		)
		expect( markup ).toContain(
			"This opening line has a heading above it.",
		)
	})

	it("still renders its own link when it has no heading", async () => {
		const markup = rendered(
			( await website.get( "/cross-field-rules" ) ).html,
		)

		// Only the opening line is dropped for want of a heading. A link an
		// editor typed is not.
		expect( markup ).toContain( "A link with no heading" )
	})

	it("lets the heading's link win over its own", async () => {
		const markup = rendered(
			( await website.get( "/cross-field-rules" ) ).html,
		)

		expect( markup ).toContain( "The heading&#x27;s link" )
		expect( markup ).not.toContain( "The section&#x27;s link" )
	})
})

describe("spacing around a block", () => {
	it("pads a section at both edges when nothing declines it", async () => {
		const [ normal ] = await section_frames( "/spacing" )

		expect( normal.padding ).toContain( "pt-6" )
		expect( normal.padding ).toContain( "pb-6" )
	})

	it("lays down no padding at all where the block asked for none", async () => {
		const [ , flush ] = await section_frames( "/spacing" )

		// Not undone from inside the block — a negative margin on a child is
		// clamped at the padding box — but never laid down.
		expect( flush.padding ).not.toMatch( /\bp[tb]-/ )
		expect( flush.outer ).not.toContain( "first-child" )
		expect( flush.outer ).not.toContain( "last-child" )
	})

	it("keeps the bottom padding when only the top was declined", async () => {
		const [ , , below ] = await section_frames( "/spacing" )

		expect( below.padding ).not.toMatch( /\bpt-/ )
		expect( below.padding ).toContain( "pb-6" )

		// The outer edge of the column follows the same decision, so a first
		// section that opens flush stays flush and a last one still closes.
		// The class is an arbitrary variant, so its ampersand arrives escaped.
		expect( below.outer ).not.toContain( "first-child" )
		expect( below.outer ).toContain( "last-child" )
	})

	it("keeps the top padding where the section has words at that edge", async () => {
		const [ , , , headed ] = await section_frames( "/spacing" )

		// A heading sits above the block, so the block is not at the edge and
		// has no say over it. The bottom is still the block's to decline.
		expect( headed.padding ).toContain( "pt-6" )
		expect( headed.padding ).not.toMatch( /\bpb-/ )
	})

	it("reads a value nobody ever set as the ordinary gap", async () => {
		const frames = await section_frames( "/spacing" )
		const never_set = frames[frames.length - 2]

		// A schema default is written when a row is created, so an entry that
		// predates the attribute comes back with `null` in it. Reading that as
		// "no spacing" would collapse the padding on every page in the site.
		expect( never_set.padding ).toContain( "pt-6" )
		expect( never_set.padding ).toContain( "pb-6" )
	})

	it("lets the section decline the space on its own", async () => {
		const frames = await section_frames( "/spacing" )
		const own = frames[frames.length - 1]

		expect( own.padding ).toContain( "pt-6" )
		expect( own.padding ).not.toMatch( /\bpb-/ )
	})
})

describe("the full-bleed image", () => {
	it("breaks out of the column it was placed in", async () => {
		const { html } = await website.get( "/everything" )

		// Two-column here: out of the main column's own inset on the left, and
		// across the white box's two gutters on the right.
		expect( html ).toContain( "md:-ml-16" )
		expect( html ).toContain( "md:-mr-2g" )
	})

	it("carries no rounded corners and no visible caption", async () => {
		const { html } = await website.get( "/everything" )

		const figure = html.slice( html.indexOf( "md:-ml-16" ) )
			.slice(
				0,
				html.slice( html.indexOf( "md:-ml-16" ) )
					.indexOf( "</figure>" ),
			)

		expect( figure ).not.toContain( "rounded-lg" )
		expect( figure ).toContain( "sr-only" )
		expect( figure ).toContain( "A caption nobody sees." )
	})
})

describe("the colour of a block's words", () => {
	it("is the one the editor picked, on every one of the four", async () => {
		const { html } = await website.get( "/text-colour" )

		expect( element_carrying( html, "Prose in white" ) )
			.toContain( "text-white" )
		expect( element_carrying( html, "Rich prose in white" ) )
			.toContain( "text-white" )
		expect( element_carrying( html, "Heading in black" ) )
			.toContain( "text-black" )
		expect( element_carrying( html, "Link in black" ) )
			.toContain( "text-black" )
	})

	it("is the colour a block has always drawn where nobody set one", async () => {
		const { html } = await website.get( "/text-colour" )

		// A schema default is written when a row is created, so an entry that
		// predates the attribute comes back with `null` in it. The four never
		// shared a colour, so each falls back to its own rather than to one
		// constant: prose in black, a heading and a link in the page's own.
		expect( element_carrying( html, "Prose saved before" ) )
			.toContain( "text-black" )
		expect( element_carrying( html, "Heading saved before" ) )
			.toContain( "text-context" )
		expect( element_carrying( html, "Link saved before" ) )
			.toContain( "text-context" )
	})

	it("leaves a heading inside rich text on the page's own colour", async () => {
		const { html } = await website.get( "/text-colour" )

		// The prose beside it is white. That colour is what marks a heading out
		// as a heading rather than as a second body typeface, so it is not the
		// prose's to take.
		const rich_heading = element_carrying( html, "Rich heading" )

		expect( rich_heading ).toContain( "text-context" )
		expect( rich_heading ).not.toContain( "text-white" )
	})

	it("draws a link styled as a button in it, border and all", async () => {
		const { html } = await website.get( "/text-colour" )

		const button = element_carrying( html, `href="/cta"` )

		expect( button ).toContain( "text-white" )
		expect( button ).toContain( "border-white" )
	})

	it("is a section's own heading's and link's to make", async () => {
		const { html } = await website.get( "/text-colour" )

		// Neither is a block an editor placed — both are attributes of the
		// section — and both still answer for themselves.
		expect( element_carrying( html, "Section heading in white" ) )
			.toContain( "text-white" )
		expect( element_carrying( html, "Section link in white" ) )
			.toContain( "text-white" )
	})
})

describe("the map", () => {
	it("makes no third-party request when its image is set", async () => {
		const { html } = await website.get( "/mapped" )

		expect( html ).toContain( "/uploads/sketch-map.svg" )
		expect( html ).not.toContain( "<iframe" )
		expect( html ).not.toContain( "maps.google.com/maps?q=" )
	})

	it("embeds a map only when the image is absent", async () => {
		const { html } = await website.get( "/everything" )

		expect( html ).toContain( "<iframe" )
		expect( html ).toContain( "maps.google.com/maps?q=" )
	})
})

describe("the page shell's injected code", () => {
	it("lands at the point of the document it names", async () => {
		const { html } = await website.get( "/injected" )

		const head = html.slice( 0, html.indexOf( "</head>" ) )

		expect( head ).toContain( "window.__head = true" )
		expect( head ).not.toContain( "window.__closing = true" )
		expect( html ).toContain( "window.__closing = true" )
	})

	it("is absent on a page whose shell declares none", async () => {
		const { html } = await website.get( "/everything" )

		expect( html ).not.toContain( "window.__head" )
	})
})

/**
 |
 | Every main-region section of a page, in order, as the two class attributes
 | that carry its spacing: the `<section>`'s own — which holds the outer edges
 | of the column — and the box inside it that does the padding.
 |
 */
async function section_frames ( path: string ) {
	const { html } = await website.get( path )

	const frames = [
		...html.matchAll(
			/<section class="([^"]*scroll-mt-4[^"]*)"[^>]*>(?:<hr[^>]*\/?>)?<div class="([^"]*)"/g,
		),
	].map( ( [ , outer, padding ] ) => ( { outer, padding } ) )

	expect( frames.length ).toBeGreaterThan( 0 )

	return frames
}

/**
 |
 | The section that came from the main region, together with the box it pads
 | with. The sidebar and the chrome have sections of their own.
 |
 */
function section_markup ( html: string ) {
	const match = html.match(
		/<section[^>]*class="[^"]*scroll-mt-4[^"]*"[^>]*>(?:<hr[^>]*>)?<div[^>]*>/,
	)

	expect( match ).not.toBeNull()

	return match![0]
}

/**
 |
 | The element carrying a needle — a piece of text, or an attribute — from its
 | opening angle bracket to the end of whatever tag closes it, which is where
 | its classes are.
 |
 */
function element_carrying ( html: string, needle: string ) {
	const markup = rendered( html )
	const at = markup.indexOf( needle )

	expect( at ).toBeGreaterThan( -1 )

	return markup.slice(
		markup.lastIndexOf( "<", at ),
		markup.indexOf( ">", at ) + 1,
	)
}

/**
 |
 | The markup a visitor sees, with the hydration payload taken out.
 |
 | React Router streams the loader's data back down as a script at the end of
 | the document, so every string the CMS sent is in the response whether it was
 | rendered or not — and a test asking whether something was *left out* would
 | pass against nothing.
 |
 */
function rendered ( html: string ) {
	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}
