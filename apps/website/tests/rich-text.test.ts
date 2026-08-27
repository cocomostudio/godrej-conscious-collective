
/**
 |
 | Rich text, rendered end to end with the CMS stubbed at the fetch boundary.
 |
 | Everything an editor can produce inside a text block is observable here — the
 | spacing between two nodes, the treatment a list gets, the shape a nested list
 | is put into, and what the toolbar's dead-end buttons degrade to — so this is
 | the seam it is all asserted at. Nothing renders a block in isolation.
 |
 | **Where a class name is asserted, it is because the class IS the behaviour.**
 | A margin that depends on what a node FOLLOWS has no server-rendered form of
 | its own: two consecutive headings are two elements with the same classes, and
 | the gap between them lives in a sibling selector that only a browser resolves.
 | The card hover suite makes the same trade for the same reason and says so.
 | Everywhere else the assertion is on the markup a visitor is sent.
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
	envelope,
	heading,
	horizontal_rule,
	plain_string,
	rich_code,
	rich_heading,
	rich_image,
	rich_item,
	rich_link,
	rich_list,
	rich_paragraph,
	rich_quote,
	rich_words,
	section,
	wysiwyg,
	wysiwyg_of,
} from "./support/envelopes.ts"

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		"/degraded": envelope( {
			main_region: [
				section( "Degraded", {
					content: [
						wysiwyg_of(
							rich_quote( "A quotation an editor typed." ),
							rich_code( "First line", "Second line" ),
							rich_paragraph(
								"Words with ",
								rich_words( "marked up", {
									code: true,
								} ),
								" in them.",
							),
						),
					],
				} ),
			],
			title: "Degraded",
		} ),

		"/lists": envelope( {
			main_region: [
				section( "Lists", {
					content: [
						wysiwyg_of(
							rich_list(
								"unordered",
								rich_item( "Bulleted one" ),
								rich_item( "Bulleted two" ),
							),
							rich_list(
								"ordered",
								rich_item( "Numbered one" ),
							),
							rich_paragraph(
								"Between the plain and the nested.",
							),
							rich_list(
								"unordered",
								rich_item( "Holds a nested list" ),
								rich_list(
									"unordered",
									rich_item( "Sub point one" ),
									rich_item( "Sub point two" ),
								),
								rich_item( "After the nested list" ),
							),
							rich_paragraph(
								"Between the two nested lists.",
							),
							rich_list(
								"unordered",
								rich_item( "Holds a nested count" ),
								rich_list(
									"ordered",
									rich_item( "Sub count one" ),
								),
							),
						),
					],
				} ),
			],
			title: "Lists",
		} ),

		"/matching": envelope( {
			main_region: [
				section( "Matching", {
					content: [
						plain_string( "Words placed on their own." ),
						wysiwyg( "Words typed into a text block." ),
						heading( "Heading placed on its own", {
							level: "h3",
						} ),
						wysiwyg_of(
							rich_heading(
								"Heading typed into a text block",
								3,
							),
							rich_paragraph(
								"Prose with ",
								rich_link( "/elsewhere", "a link" ),
								" in it.",
							),
						),
					],
				} ),
			],
			title: "Matching",
		} ),

		"/nesting": envelope( {
			main_region: [
				section( "Nesting", {
					content: [
						wysiwyg_of(
							rich_paragraph(
								"Before the over-indented list.",
							),
							rich_list(
								"unordered",
								rich_item( "Top point" ),
								rich_list(
									"unordered",
									rich_item( "First sub point" ),
									rich_list(
										"unordered",
										rich_item( "Indented twice" ),
										rich_list(
											"unordered",
											rich_item(
												"Indented three times",
											),
										),
									),
									rich_item( "Last sub point" ),
								),
							),
							rich_paragraph( "Between the two lists." ),
							rich_list(
								"unordered",
								rich_list(
									"unordered",
									rich_item(
										"Nested with nothing above it",
									),
								),
								rich_item( "The item that follows" ),
							),
						),
					],
				} ),
			],
			title: "Nesting",
		} ),

		"/pieces": envelope( {
			main_region: [
				section( "Pieces", {
					content: [
						wysiwyg_of(
							rich_paragraph( "" ),
							rich_paragraph(
								"The first visible paragraph.",
							),
							rich_paragraph(
								"Kept apart\nby a line break.",
							),
							rich_image( "/uploads/inside.png" ),
						),
					],
				} ),
			],
			title: "Pieces",
		} ),

		"/rules": envelope( {
			main_region: [
				section( "Rules", {
					content: [
						wysiwyg_of(
							rich_paragraph( "Above the rule." ),
							rich_paragraph( "---" ),
							rich_paragraph( "Below the rule." ),
							rich_paragraph( " ---" ),
							rich_paragraph(
								rich_words( "---", { bold: true } ),
							),
							rich_paragraph(
								rich_words( "--- and unbolded", {
									bold: false,
								} ),
							),
							rich_list(
								"unordered",
								rich_item( "---" ),
							),
							rich_paragraph( "# Not a heading" ),
							rich_paragraph( "- Not a list" ),
							rich_paragraph( "**Not bold**" ),
						),
						horizontal_rule(),
						plain_string( "After the passage." ),
					],
				} ),
			],
			title: "Rules",
		} ),

		"/spacing": envelope( {
			main_region: [
				section( "Spacing", {
					content: [
						wysiwyg_of(
							rich_heading( "Opening heading" ),
							rich_paragraph( "Under the heading." ),
							rich_paragraph( "Under a paragraph." ),
							rich_list(
								"unordered",
								rich_item(
									"Under a paragraph, in a list",
								),
							),
							rich_paragraph( "Under a list." ),
							rich_heading(
								"Under a paragraph, a heading",
							),
							rich_heading( "Under a heading, a heading" ),
							rich_list(
								"ordered",
								rich_item(
									"Under a heading, in a list",
								),
							),
							rich_list(
								"unordered",
								rich_item( "Under a list, in a list" ),
							),
						),
					],
				} ),
			],
			title: "Spacing",
		} ),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

describe("a heading inside rich text", () => {
	it("takes the heading component's size and weight", async () => {
		const { html } = await website.get( "/matching" )

		// Both asked for the third size. The size is the editor's choice and
		// the only one they get to make about how a heading looks.
		expect( classes_of( html, "Heading placed on its own" ) )
			.toContain( "text-h3" )
		expect( classes_of( html, "Heading typed into a text block" ) )
			.toContain( "text-h3" )
		expect( classes_of( html, "Heading typed into a text block" ) )
			.toContain( "md:font-semibold" )
	})

	it("takes its element from nesting rather than from the size chosen", async () => {
		const { html } = await website.get( "/matching" )

		// Both sit one level below the page's own title, so both are `h2`
		// elements whatever size they asked to be drawn at.
		expect( headings( html ) ).toEqual( [
			"h1:Matching",
			"h2:Heading placed on its own",
			"h2:Heading typed into a text block",
		] )
	})
})

describe("a paragraph inside rich text", () => {
	it("is drawn exactly as a plain string placed on its own", async () => {
		const { html } = await website.get( "/matching" )

		// One implementation, so this is an equality rather than a list of
		// classes both happen to carry.
		expect( classes_of( html, "Words typed into a text block." ) )
			.toBe( classes_of( html, "Words placed on their own." ) )
	})
})

describe("the space between two nodes", () => {
	it("is sixteen pixels under a heading, a paragraph and a list alike", async () => {
		const { html } = await website.get( "/spacing" )

		expect( classes_of( html, "Under the heading." ) )
			.toContain( "mt-4" )
		expect( classes_of( html, "Under a paragraph." ) )
			.toContain( "mt-4" )
		expect( classes_of( html, "Under a list." ) )
			.toContain( "mt-4" )
		expect( list_around( html, "Under a paragraph, in a list" ) )
			.toContain( "mt-4" )
	})

	it("does not change at a breakpoint", async () => {
		const { html } = await website.get( "/spacing" )

		// The gap is the same on a phone as on a desktop, so no node in the
		// passage carries a responsive margin of its own.
		expect( classes_of( html, "Under the heading." ) )
			.not.toMatch( /md:mt-/ )
		expect( classes_of( html, "Under a paragraph." ) )
			.not.toMatch( /md:mt-/ )
		expect( list_around( html, "Under a paragraph, in a list" ) )
			.not.toMatch( /md:mt-/ )
	})

	it("is sixteen pixels between the items of any list", async () => {
		const { html } = await website.get( "/spacing" )

		expect( list_around( html, "Under a paragraph, in a list" ) )
			.toContain( "space-y-4" )
		expect( list_around( html, "Under a heading, in a list" ) )
			.toContain( "space-y-4" )
	})

	it("is sixteen pixels above a list, whatever the list follows", async () => {
		const { html } = await website.get( "/spacing" )

		expect( list_around( html, "Under a heading, in a list" ) )
			.toContain( "mt-4" )
		expect( list_around( html, "Under a list, in a list" ) )
			.toContain( "mt-4" )
	})

	it("is twenty-four pixels between two headings, thirty-two from medium", async () => {
		const { html } = await website.get( "/spacing" )

		// The only gap in the passage that depends on what a node FOLLOWS, and
		// so the only one with no server-rendered form — see the file's header.
		// The rule and the class it keys off travel together on every heading;
		// what makes it apply is the two being siblings in the markup.
		const heading_classes = classes_of(
			html,
			"Under a heading, a heading",
		)

		expect( heading_classes ).toContain( "rich-heading" )
		expect( heading_classes ).toContain( "[.rich-heading+&]:mt-6" )
		expect( heading_classes ).toContain( "md:[.rich-heading+&]:mt-8" )
		expect( classes_of( html, "Under a paragraph, a heading" ) )
			.toContain( "mt-4" )
	})

	it("around a horizontal rule is the rule's own, untouched", async () => {
		const { html } = await website.get( "/rules" )

		const [ from_the_shorthand, from_the_component ] = rules( html )

		expect( from_the_shorthand ).toBe( from_the_component )
	})

	it("is none of a horizontal rule's own", async () => {
		const { html } = await website.get( "/rules" )

		// A rule separates; it does not space. What sits around one is
		// whatever its neighbours already leave — which in a passage of prose,
		// spaced from the top and not the bottom, is nothing above it.
		for ( const rule of rules( html ) ) {
			expect( rule ).not.toMatch( /\bm[ytb]-/ )
		}
	})
})

describe("a list", () => {
	it("keeps a disc marker and its indent", async () => {
		const { html } = await website.get( "/lists" )

		const list = list_around( html, "Bulleted one" )

		expect( list ).toContain( "list-disc" )
		expect( list ).toContain( "pl-5" )
	})

	it("is set at the page's own body size, as its paragraphs are", async () => {
		const { html } = await website.get( "/lists" )

		// The size the page's arrangement asks for, which a one-column page
		// answers differently from a two-column one. The nested card names no
		// size of its own and inherits this.
		const size = classes_of( html, "Between the plain and the nested." )
			.split( " " )
			.find( ( name ) => name.startsWith( "text-" ) )

		expect( size ).toBeTruthy()
		expect( list_around( html, "Bulleted one" ) ).toContain( size! )
	})

	it("keeps decimal numbering when it is numbered", async () => {
		const { html } = await website.get( "/lists" )

		expect( list_around( html, "Numbered one" ) )
			.toContain( "list-decimal" )
	})
})

describe("a nested list", () => {
	it("is the card the rest of the site draws it as", async () => {
		const { html } = await website.get( "/lists" )

		const card = tag_after( html, "Holds a nested list" )

		expect( card ).toContain( "border" )
		expect( card ).toContain( "border-gray-dark" )
		expect( card ).toContain( "rounded-lg" )
		expect( card ).toContain( "bg-gray-light" )
		expect( card ).toContain( "px-4" )
		expect( card ).toContain( "py-8" )
	})

	it("is pulled back to the parent item's text edge", async () => {
		const { html } = await website.get( "/lists" )

		// The parent list indents by the same amount, so the card's left edge
		// lands where the parent item's words start rather than where its
		// marker does.
		expect( list_around( html, "Bulleted one" ) ).toContain( "pl-5" )
		expect( tag_after( html, "Holds a nested list" ) )
			.toContain( "-ml-5" )
	})

	it("keeps its own space above, and above what follows it", async () => {
		const { html } = await website.get( "/lists" )

		const card = tag_after( html, "Holds a nested list" )

		expect( card ).toContain( "my-6" )
		expect( card ).toContain( "md:my-8" )
	})

	it("marks its points with the site's rhombus", async () => {
		const { html } = await website.get( "/lists" )

		const card = markup_after( html, "Holds a nested list", "</ul>" )

		expect( card ).toContain( "<svg" )
		expect( ( card.match( /<svg/g ) ?? [] ).length ).toBe( 2 )
	})

	it("draws that rhombus in the words' own colour", async () => {
		const { html } = await website.get( "/lists" )

		const card = markup_after( html, "Holds a nested list", "</ul>" )

		// Drawn inline and stroked with `currentColor`, so it follows whatever
		// colour the list is drawn in without being told. The static site hands
		// the symbol to the page as a custom property and applies it as a mask,
		// which cannot follow a colour and is not what happens here.
		expect( card ).toContain( `stroke="currentColor"` )
		expect( rendered( html ) ).not.toContain( "mask-image" )
	})

	it("takes the same card without the rhombi when it is numbered", async () => {
		const { html } = await website.get( "/lists" )

		const card = tag_after( html, "Holds a nested count" )

		expect( card ).toContain( "bg-gray-light" )
		expect( card ).toContain( "rounded-lg" )
		expect( card ).toContain( "-ml-5" )
		expect( card ).toContain( "list-decimal" )
		expect( markup_after( html, "Holds a nested count", "</ol>" ) )
			.not.toContain( "<svg" )
	})
})

describe("nesting", () => {
	it("puts a nested list inside the item it belongs under", async () => {
		const { html } = await website.get( "/lists" )

		// Strapi files a nested list beside the items rather than inside one,
		// which is a list directly inside a list and is not valid markup.
		expect( lists_inside_lists( html ) ).toEqual( [] )
	})

	it("gives a list that opens with one an item to hold it", async () => {
		const { html } = await website.get( "/nesting" )

		// Nothing precedes it to adopt it, so an empty item is made rather
		// than the nested list being promoted out of its indent.
		expect( lists_inside_lists( html ) ).toEqual( [] )
		expect( rendered( html ) ).toContain( "Nested with nothing above it" )
		expect( rendered( html ) ).toContain( "The item that follows" )
	})

	it("lifts a deeper list into the first nested level, in document order", async () => {
		const { html } = await website.get( "/nesting" )

		const card = markup_after(
			html,
			"Top point",
			"Between the two lists.",
		)

		// Every word survives an over-indent; only the indentation is lost.
		expect( text_of( card ) ).toBe(
			"First sub pointIndented twiceIndented three timesLast sub point",
		)
	})
})

describe("the buttons that lead nowhere", () => {
	it("render a quotation as an ordinary paragraph", async () => {
		const { html } = await website.get( "/degraded" )

		expect( rendered( html ) ).not.toContain( "<blockquote" )
		expect( classes_of( html, "A quotation an editor typed." ) )
			.toBe( classes_of( html, "Words with " ) )
	})

	it("render a code block as a paragraph, its lines still apart", async () => {
		const { html } = await website.get( "/degraded" )

		const block = markup_after( html, "First line", "</p>" )

		expect( rendered( html ) ).not.toContain( "<pre" )
		expect( classes_of( html, "First line" ) ).not.toContain( "font-mono" )
		expect( block ).toContain( "<br/>" )
		expect( block ).toContain( "Second line" )
	})

	it("render inline code as ordinary words", async () => {
		const { html } = await website.get( "/degraded" )

		expect( rendered( html ) ).toContain( "marked up" )
		expect( rendered( html ) ).not.toContain( "font-mono" )
	})
})

describe("what an editor left behind", () => {
	it("drops a wholly empty paragraph rather than hiding it", async () => {
		const { html } = await website.get( "/pieces" )

		// A hidden node still counts as the first child, and would take the
		// collapsed top margin meant for the first visible one.
		expect( classes_of( html, "The first visible paragraph." ) )
			.toContain( "first:mt-0" )
		expect( rendered( html ) ).not.toContain( "<p></p>" )
		expect( markup_before( html, "The first visible paragraph." ) )
			.not.toContain( "<br/>" )
	})

	it("keeps a line break inside a paragraph", async () => {
		const { html } = await website.get( "/pieces" )

		expect( markup_after( html, "Kept apart", "</p>" ) )
			.toContain( "<br/>" )
	})

	it("draws an image with the image leaf and no caption", async () => {
		const { html } = await website.get( "/pieces" )

		expect( rendered( html ) ).toContain( "/uploads/inside.png" )
		expect( rendered( html ) )
			.not.toContain( "A caption the renderer never shows." )
	})
})

describe("the one shorthand", () => {
	it("turns a line of exactly three dashes into a rule", async () => {
		const { html } = await website.get( "/rules" )

		expect( rules( html ).length ).toBe( 2 )
		expect( markup_after( html, "Above the rule.", "Below the rule." ) )
			.toContain( "<hr" )
	})

	it("leaves a dashed line alone where anything else is on it", async () => {
		const { html } = await website.get( "/rules" )

		// A leading space, any formatting, and a list item are each enough to
		// disqualify it. Two rules on the page and no more: the shorthand's
		// own, and the component an editor placed.
		const body = body_of( html )

		expect( body ).toContain( " ---" )
		expect( body ).toContain( "<strong" )
		expect( body ).toContain( "<li>---</li>" )
		expect( rules( html ).length ).toBe( 2 )
	})

	it("reads a modifier turned off as no formatting at all", async () => {
		const { html } = await website.get( "/rules" )

		// An editor who bolds a run of words and then unbolds it can leave the
		// modifier behind as `false`. That is a key on the node and it is not
		// formatting, so it is not what disqualifies a rule — the text is.
		expect( classes_of( html, "--- and unbolded" ) ).toContain( "mt-4" )
		expect( body_of( html ) ).toContain( "--- and unbolded" )
	})

	it("is the only string the renderer interprets", async () => {
		const { html } = await website.get( "/rules" )

		// Rich text is not markdown, and nothing else an editor types is
		// reinterpreted on the way to the page.
		const body = body_of( html )

		expect( body ).toContain( "# Not a heading" )
		expect( body ).toContain( "- Not a list" )
		expect( body ).toContain( "**Not bold**" )
	})
})

describe("colour inside a text block", () => {
	it("is left exactly where it was", async () => {
		const { html } = await website.get( "/matching" )

		// This ticket changes what rich text LOOKS like and not what its
		// colour attribute governs, which arrives separately.
		expect( classes_of( html, "Heading typed into a text block" ) )
			.toContain( "text-context" )
		expect( classes_of( html, "a link" ) ).toContain( "text-context" )
	})
})

/**
 |
 | The markup helpers below read the rendered HTML rather than the React tree,
 | because the rendered HTML is what a visitor gets.
 |
 */

function rendered ( html: string ) {
	return html.replace( /<script[\s\S]*?<\/script>/g, "" )
}

/**
 |
 | React Router streams the loader's data back down as a script, so every string
 | the CMS sent is in the response whether the page rendered it or not.
 |
 */
function body_of ( html: string ) {
	return rendered( html ).slice( html.indexOf( "<body" ) )
}

function at_needle ( html: string, needle: string ) {
	const markup = rendered( html )
	const at = markup.indexOf( needle )

	expect( at, `no "${needle}" in the markup` ).toBeGreaterThan( -1 )

	return { at, markup }
}

/** The opening tag of the innermost element holding a piece of text. */
function tag_before ( html: string, needle: string ) {
	const { at, markup } = at_needle( html, needle )

	return markup.slice(
		markup.lastIndexOf( "<", at ),
		markup.indexOf( ">", at ) + 1,
	)
}

/** The opening tag of the element that follows a piece of text. */
function tag_after ( html: string, needle: string ) {
	const { at, markup } = at_needle( html, needle )
	const opens = markup.indexOf( "<", at )

	return markup.slice( opens, markup.indexOf( ">", opens ) + 1 )
}

/**
 |
 | The classes on the element holding a piece of text, as a browser reads them.
 |
 | Entities are decoded because that is the difference between what the
 | serialiser wrote and what the element carries: an arbitrary variant naming its
 | own element — `[.rich-heading+&]:mt-6` — travels down the wire as `&amp;`.
 |
 */
function classes_of ( html: string, needle: string ) {
	const attribute = tag_before( html, needle ).match( /class="([^"]*)"/ )

	return ( attribute?.[1] ?? "" ).replace( /&amp;/g, "&" )
}

/** The opening tag of the list a piece of text sits in. */
function list_around ( html: string, needle: string ) {
	const { at, markup } = at_needle( html, needle )
	const opens = Math.max(
		markup.lastIndexOf( "<ul", at ),
		markup.lastIndexOf( "<ol", at ),
	)

	expect( opens, `no list around "${needle}"` ).toBeGreaterThan( -1 )

	return markup.slice( opens, markup.indexOf( ">", opens ) + 1 )
}

/** What lies between a piece of text and the next thing named. */
function markup_after ( html: string, needle: string, until: string ) {
	const { at, markup } = at_needle( html, needle )
	const from = at + needle.length
	const stop = markup.indexOf( until, from )

	return markup.slice( from, stop === -1 ? undefined : stop )
}

function markup_before ( html: string, needle: string ) {
	const { at, markup } = at_needle( html, needle )

	return markup.slice( markup.indexOf( "<body" ), at )
}

/**
 |
 | Every horizontal rule the passage itself drew, as its opening tag.
 |
 | Bounded by the passage's own first and last words, because a section draws a
 | rule above whatever an editor put in it and the site's chrome draws more
 | below — neither of those is the passage's.
 |
 */
function rules ( html: string ) {
	const passage = markup_after(
		html,
		"Above the rule.",
		"After the passage.",
	)

	return [ ...passage.matchAll( /<hr[^>]*>/g ) ].map( ( [ tag ] ) => tag )
}

/**
 |
 | Every list drawn directly inside another, which is the defect. A list belongs
 | inside a list ITEM, so a list open tag reached without passing an `<li` on
 | the way is one of these.
 |
 */
function lists_inside_lists ( html: string ) {
	return [
		...body_of( html ).matchAll( /(?:<[uo]l[^>]*>|<\/li>)\s*<([uo]l)/g ),
	].map( ( [ found ] ) => found )
}

function headings ( html: string ) {
	return [ ...rendered( html ).matchAll( /<(h[1-6])\b[^>]*>(.*?)<\/\1>/g ) ]
		.map( ( [ , tag, content ] ) => `${tag}:${strip( content )}` )
}

function text_of ( markup: string ) {
	return strip( markup )
}

function strip ( markup: string ) {
	return markup.replace( /<[^>]*>/g, "" ).trim()
}
