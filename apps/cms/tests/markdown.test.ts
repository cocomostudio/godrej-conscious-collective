
/**
 |
 | The seed's markdown parser.
 |
 | A pure function of a string, so nothing is booted here — the same reason the
 | Maps URL reader's suite boots nothing, and the same reason both are modules
 | of their own rather than code inside the thing that calls them.
 |
 | What is pinned is the mapping and the two places it deliberately parts
 | company with CommonMark: setext headings are off, and a newline inside a
 | paragraph is a hard break. Everything
 | outside the supported subset throws, and that is pinned too, because a parser
 | that drops what it does not understand ships a page with a hole in it.
 |
 */

import { describe, expect, it } from "vitest"

import { rich_text_from_markdown } from "../scripts/seed/lib/markdown.ts"

/** The one shape every text node has, spelled out once. */
function words ( text: string, marks: Record<string, true> = {} ) {
	return { text, type: "text", ...marks }
}

describe("the nodes", () => {
	it("reads a heading at the level it was written", () => {
		expect( rich_text_from_markdown( "### Location\n" ) ).toEqual( [
			{ children: [ words( "Location" ) ], level: 3, type: "heading" },
		] )
	})

	it("reads a paragraph", () => {
		expect( rich_text_from_markdown( "Two words.\n" ) ).toEqual( [
			{ children: [ words( "Two words." ) ], type: "paragraph" },
		] )
	})

	// One picture and no sentence around it: rich text files an image at the
	// top level, where markdown files it inside the paragraph it was typed on.
	it("lifts a picture out of the paragraph it was written in", () => {
		const [ picture ] = rich_text_from_markdown(
			"![The courtyard](https://e.test/c.png)\n",
		) as any[]

		expect( picture.type ).toBe( "image" )
		expect( picture.children ).toEqual( [ words( "" ) ] )
		expect( picture.image ).toMatchObject( {
			alternativeText: "The courtyard",
			url: "https://e.test/c.png",
		} )
	})

	/*
	 | The one place in the seed a bare address will not do. Rich text holds the
	 | media library's own row, and Strapi refuses the write without every field
	 | of one — so the picture is described rather than pointed at.
	 */
	it("describes the picture the way a media row is described", () => {
		const [ picture ] = rich_text_from_markdown(
			"![](https://e.test/gates.png)\n",
		) as any[]

		expect( picture.image ).toMatchObject( {
			ext: ".png",
			mime: "image/png",
			name: "gates.png",
		} )

		for (
			const field of [
				"createdAt",
				"hash",
				"height",
				"provider",
				"size",
				"updatedAt",
				"width",
			]
		) {
			expect( picture.image[field] ).toBeDefined()
		}
	})

	it("refuses a picture written amongst words", () => {
		expect( () =>
			rich_text_from_markdown(
				"Look ![here](https://e.test/c.png) now\n",
			)
		)
			.toThrow( /alone on its line/ )
	})
})

describe("lists", () => {
	it("reads a bulleted list", () => {
		expect( rich_text_from_markdown( "- one\n- two\n" ) ).toEqual( [
			{
				children: [
					{ children: [ words( "one" ) ], type: "list-item" },
					{ children: [ words( "two" ) ], type: "list-item" },
				],
				format: "unordered",
				type: "list",
			},
		] )
	})

	it("reads a numbered list", () => {
		expect( rich_text_from_markdown( "1. one\n2. two\n" )[0] )
			.toMatchObject( { format: "ordered", type: "list" } )
	})

	/*
	 | **A nested list comes out beside the item it belongs under, not inside
	 | it.** That is where Strapi files one, and this parser writes what Strapi
	 | stores — anything else would be seeding a shape the CMS never sends.
	 */
	it("files a nested list beside the item it belongs under", () => {
		expect( rich_text_from_markdown( "- one\n    - under one\n" ) )
			.toEqual( [
				{
					children: [
						{
							children: [ words( "one" ) ],
							type: "list-item",
						},
						{
							children: [
								{
									children: [ words( "under one" ) ],
									type: "list-item",
								},
							],
							format: "unordered",
							type: "list",
						},
					],
					format: "unordered",
					type: "list",
				},
			] )
	})

	/*
	 | Two levels are kept as two levels. Flattening past the first is the
	 | website's rule and is applied where the page is drawn — a parser that
	 | flattened here would quietly delete the content written to exercise it.
	 */
	it("keeps a second level of nesting rather than flattening it", () => {
		const [ list ] = rich_text_from_markdown(
			"- one\n    - under one\n        - under that\n",
		) as any[]

		const nested = list.children[1]
		const deeper = nested.children[1]

		expect( nested.type ).toBe( "list" )
		expect( deeper.type ).toBe( "list" )
		expect( deeper.children ).toEqual( [
			{ children: [ words( "under that" ) ], type: "list-item" },
		] )
	})

	it("keeps an item's words when a nested list follows them", () => {
		const [ list ] = rich_text_from_markdown(
			"- In broad terms:\n    - one purpose\n",
		) as any[]

		expect( list.children[0] ).toEqual( {
			children: [ words( "In broad terms:" ) ],
			type: "list-item",
		} )
	})
})

describe("inline formatting", () => {
	it("marks bold, italic and inline code", () => {
		expect(
			rich_text_from_markdown(
				"A **bold** and _slanted_ and `typed` run.\n",
			),
		)
			.toEqual( [ {
				children: [
					words( "A " ),
					words( "bold", { bold: true } ),
					words( " and " ),
					words( "slanted", { italic: true } ),
					words( " and " ),
					words( "typed", { code: true } ),
					words( " run." ),
				],
				type: "paragraph",
			} ] )
	})

	it("keeps formatting that is nested inside more formatting", () => {
		expect( rich_text_from_markdown( "**_both_**\n" ) ).toEqual( [ {
			children: [ words( "both", { bold: true, italic: true } ) ],
			type: "paragraph",
		} ] )
	})

	it("reads a link, with its own words inside it", () => {
		expect( rich_text_from_markdown( "[Maps](https://e.test/m)\n" ) )
			.toEqual( [ {
				children: [ {
					children: [ words( "Maps" ) ],
					type: "link",
					url: "https://e.test/m",
				} ],
				type: "paragraph",
			} ] )
	})
})

/*
 | Markdown's own spellings for a line break — two trailing spaces, or a
 | trailing backslash — are not used, because the repository's formatter strips
 | trailing whitespace and would make the first fail with nothing to see. Every
 | newline inside a paragraph is one instead, emitted inside the text node,
 | which is what the website already draws as a break.
 */
describe("hard breaks", () => {
	it("keeps a newline inside a paragraph, in the text node", () => {
		expect(
			rich_text_from_markdown( "Plant 13, Pirojshanagar\nVikhroli\n" ),
		)
			.toEqual( [ {
				children: [ words( "Plant 13, Pirojshanagar\nVikhroli" ) ],
				type: "paragraph",
			} ] )
	})

	it("keeps a newline that lands beside a run of formatting", () => {
		expect( rich_text_from_markdown( "**Bag End**\nThe Shire\n" ) )
			.toEqual( [ {
				children: [
					words( "Bag End", { bold: true } ),
					words( "\nThe Shire" ),
				],
				type: "paragraph",
			} ] )
	})

	it("starts a new paragraph at a blank line", () => {
		expect( rich_text_from_markdown( "One.\n\nTwo.\n" ) ).toEqual( [
			{ children: [ words( "One." ) ], type: "paragraph" },
			{ children: [ words( "Two." ) ], type: "paragraph" },
		] )
	})
})

/*
 | Rich text has no horizontal rule node, so the rule is a paragraph holding the
 | literal `---` and the website reads that string back. The seed and the
 | renderer meet on it, and this is the seed's half.
 */
describe("the rule", () => {
	it("emits a paragraph holding the three characters", () => {
		expect( rich_text_from_markdown( "Above.\n\n---\n\nBelow.\n" ) )
			.toEqual( [
				{ children: [ words( "Above." ) ], type: "paragraph" },
				{ children: [ words( "---" ) ], type: "paragraph" },
				{ children: [ words( "Below." ) ], type: "paragraph" },
			] )
	})

	it("emits one that opens the document", () => {
		expect( rich_text_from_markdown( "---\n\nBelow.\n" )[0] ).toEqual( {
			children: [ words( "---" ) ],
			type: "paragraph",
		} )
	})

	// With setext headings off, a line of dashes under a line of prose is the
	// rule the writer was reaching for. No blank line is needed to say so.
	it("emits one written straight under a line of prose", () => {
		expect( rich_text_from_markdown( "Above.\n---\n" ) ).toEqual( [
			{ children: [ words( "Above." ) ], type: "paragraph" },
			{ children: [ words( "---" ) ], type: "paragraph" },
		] )
	})
})

/*
 | A line of dashes beneath a line of text is the one markdown rule that changes
 | the meaning of the line above it. A writer reaching for a rule would never
 | see it happen, so the construct is off.
 */
describe("setext headings", () => {
	it("leaves a line of equals signs as the words it is", () => {
		expect( rich_text_from_markdown( "Website Privacy Policy\n===\n" ) )
			.toEqual( [ {
				children: [ words( "Website Privacy Policy\n===" ) ],
				type: "paragraph",
			} ] )
	})

	it("does not turn the line above a rule into a heading", () => {
		expect( rich_text_from_markdown( "Website Privacy Policy\n\n---\n" ) )
			.toEqual( [
				{
					children: [ words( "Website Privacy Policy" ) ],
					type: "paragraph",
				},
				{ children: [ words( "---" ) ], type: "paragraph" },
			] )
	})
})

/*
 | Seed content is written in this repository, so markdown outside the subset is
 | a bug to fix rather than input to tolerate. It stops the seed where it is
 | written; nothing is dropped into a page nobody looks at again.
 */
describe("what it refuses", () => {
	it("refuses a table", () => {
		expect( () =>
			rich_text_from_markdown( "| a | b |\n| - | - |\n| 1 | 2 |\n" )
		)
			.toThrow( /tables are not supported/ )
	})

	it("names the line the table is on", () => {
		expect( () =>
			rich_text_from_markdown( "Words.\n\n| a | b |\n| - | - |\n" )
		)
			.toThrow( /line 4/ )
	})

	it("refuses inline HTML", () => {
		expect( () =>
			rich_text_from_markdown( "<address>Bag End</address>\n" )
		)
			.toThrow( /Unsupported markdown: html/ )
	})

	it("refuses a block quotation", () => {
		expect( () => rich_text_from_markdown( "> Quoted.\n" ) )
			.toThrow( /Unsupported markdown: blockquote/ )
	})

	it("refuses a code block", () => {
		expect( () => rich_text_from_markdown( "```\nnpm run seed\n```\n" ) )
			.toThrow( /Unsupported markdown: code/ )
	})

	it("names the line the trouble is on", () => {
		expect( () => rich_text_from_markdown( "Words.\n\n> Quoted.\n" ) )
			.toThrow( /on line 3/ )
	})
})
