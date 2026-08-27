
/**
 |
 | The dark ground, and the four blocks that read it.
 |
 | **This is the one test file that does not go through the website's seam**,
 | and the reason is that the seam cannot reach what is under test. The only
 | dark ground in the build is the Archive's snapshot dialog, the dialog is
 | mounted by a press, and nothing mounted by a press is in a server-rendered
 | string. Driving HTTP here would assert nothing.
 |
 | So the blocks are rendered directly, as markup, with and without the ground
 | under them. That is a narrower seam than the rest of the suite uses and it is
 | narrow on purpose: it holds one question — *does a block change when the
 | ground does* — and it is not a licence to render blocks in isolation
 | elsewhere, where the HTTP seam works and covers more.
 |
 | The regression it exists for is specific. `use_dark_surface` is a context
 | with a default of `false`, so every way it can break — a provider that stops
 | wrapping, an import that resolves to a second copy of the module, a block
 | that stops asking — fails the same way: silently, to the light treatment,
 | with black words on a black slide. Nothing throws and nothing looks wrong
 | until somebody opens the dialog.
 |
 | **The forced context is here for the same reason and nothing else is.** The
 | dialog points `--ctx-context-color` at white, so a block drawing in
 | `text-context` or `border-context` is white too — and like everything else in
 | this file, that declaration only exists in a tree nothing server-renders.
 | Every other thing this build's colours do is observable over HTTP and is
 | tested there.
 |
 */

import {
	type ReactNode,
	createElement as h,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
	describe,
	expect,
	it,
} from "vitest"

import { Dark_Surface } from "../src/web/cms/dark-surface.tsx"
import { Media_Origin } from "../src/web/cms/media-origin.tsx"
import { Gallery } from "../src/web/cms/blocks/gallery.tsx"
import { Heading } from "../src/web/cms/blocks/heading.tsx"
import { Link_Block } from "../src/web/cms/blocks/link.tsx"
import { Image_And_Content } from "../src/web/cms/blocks/image-and-content.tsx"
import { Quote } from "../src/web/cms/blocks/quote.tsx"
import { Wysiwyg } from "../src/web/cms/blocks/wysiwyg.tsx"

/** The same tree, on a white page and on a dark one. */
function both ( node: ReactNode ) {
	const wrap = ( inner: ReactNode ) =>
		renderToStaticMarkup(
			h( Media_Origin, {
				children: inner,
				origin: "http://cms.test",
			} ),
		)

	return {
		dark: wrap( h( Dark_Surface, null, node ) ),
		light: wrap( node ),
	}
}

const CAPTIONED = {
	alt: "",
	caption: "What the picture shows.",
	file: null,
	title: null,
	url: "/uploads/one.png",
}

const PARAGRAPH = [ {
	children: [ { text: "Some prose.", type: "text" } ],
	type: "paragraph",
} ]

const A_HEADING = [ {
	children: [ { text: "A subheading.", type: "text" } ],
	level: 2,
	type: "heading",
} ]

describe("a quotation", () => {
	const rendered = both(
		h( Quote, {
			attribution: "Somebody, somewhere",
			quote: "A quotable sentence.",
		} ),
	)

	it("is a grey card on a white page", () => {
		expect( rendered.light ).toContain( "bg-gray-light" )
	})

	it("is a bare pull-quote on a dark one", () => {
		// The static site's second treatment: nothing behind the words at
		// all, because the plate would be the only thing on the slide.
		expect( rendered.dark ).not.toContain( "bg-gray-light" )
		expect( rendered.dark ).toContain( "A quotable sentence." )
		expect( rendered.dark ).toContain( "Somebody, somewhere" )
	})

	it("says the opening mark for anything not looking at it", () => {
		// The mark is a symbol above the words, which a screen reader does
		// not read as one.
		expect( rendered.dark ).toContain( "text-[0px]" )
	})
})

describe("a caption", () => {
	const rendered = both(
		h( Gallery, {
			images: [ CAPTIONED, { ...CAPTIONED, url: "/uploads/two.png" } ],
			layout: "equal",
		} ),
	)

	it("follows the ground with no editor choice in between", () => {
		// Unlike the words a `text_color` attribute governs, a caption belongs
		// to the picture: there is nothing here to override.
		expect( rendered.light ).toContain( "text-black" )
		expect( rendered.light ).not.toContain( "text-white" )
		expect( rendered.dark ).toContain( "text-white" )
	})
})

describe("prose", () => {
	it("falls back to white over a dark ground", () => {
		const rendered = both( h( Wysiwyg, { rich_text: PARAGRAPH as any } ) )

		// On a white page an unanswered block draws its own colour, which for
		// prose is black — the schema answers `auto` on all four components
		// that carry the attribute and leaves each of them to say what that
		// means. Over the dark ground it is white regardless.
		expect( prose_class_of( rendered.light ) ).toBe( "text-black" )
		expect( rendered.dark ).toContain( "text-white" )
	})

	// **The dialog forces its colours**, so this is every value an editor can
	// pick, `auto` included. A snapshot nobody can read is not a state the
	// catalogue should be able to reach, and the enclosing Archive component's
	// admin description says so.
	it("is white whatever an editor picked", () => {
		for (
			const chosen of [ "auto", "black", "context", "theme", "white" ]
		) {
			const rendered = both(
				h( Wysiwyg, {
					rich_text: PARAGRAPH as any,
					text_color: chosen,
				} ),
			)

			expect( { chosen, drawn: prose_class_of( rendered.dark ) } )
				.toEqual( { chosen, drawn: "text-white" } )
		}
	})

	// The rule that read a stored `black` as no answer at all is gone. It only
	// existed because `black` was the schema's default and could not be told
	// apart from a value nobody chose; `auto` is the default now, and it is
	// the one value that means nobody chose.
	it("draws a stored black as black on a white page", () => {
		const rendered = both(
			h( Wysiwyg, {
				rich_text: PARAGRAPH as any,
				text_color: "black",
			} ),
		)

		expect( rendered.light ).toContain( "text-black" )
	})

	it("draws its subheadings in a context colour that is itself white", () => {
		const rendered = both( h( Wysiwyg, { rich_text: A_HEADING as any } ) )

		// The class does not change — the alias behind it does, which is the
		// whole of how the forced context works.
		expect( rendered.light ).toContain( "text-context" )
		expect( rendered.dark ).toContain( "text-context" )
		expect( rendered.dark ).toContain( FORCED_CONTEXT )
	})
})

describe("a floated caption", () => {
	it("paints the ground it is actually over", () => {
		// It is positioned across the column of words rather than flowing in
		// it, so it has to paint something — and a white plate on a black
		// slide is a white box with black words in the middle of it.
		const rendered = both(
			h( Image_And_Content, {
				children: null,
				image: CAPTIONED,
				layout: "image-left",
			} ),
		)

		expect( rendered.light ).toContain( "bg-white" )
		expect( rendered.dark ).toContain( "bg-black" )
	})
})

describe("a heading and a link", () => {
	// Both are reachable inside the dialog through the image-and-content
	// composite's own region, and both carry `text_color` of their own.
	//
	// The URLs are absolute so that `Nav_Link` takes its plain-anchor branch.
	// A site-relative one renders a React Router `<Link>`, which needs a
	// router above it — which is the narrow seam's cost, and the reason the
	// rest of the suite drives HTTP instead.
	const on_black = ( node: ReactNode ) => both( node ).dark

	it("are white over a dark ground whatever they asked for", () => {
		for (
			const chosen of [ "auto", "black", "context", "theme", "white" ]
		) {
			const heading = on_black( h( Heading, {
				__component: "text.heading-v1",
				content: "A heading",
				id: 1,
				text_color: chosen,
			} as any ) )

			const link = on_black( h( Link_Block, {
				label: "A link",
				style: "plain",
				text_color: chosen,
				url: "https://example.com/somewhere",
			} as any ) )

			expect( {
				chosen,
				heading: heading.includes( "text-white" ),
				link: link.includes( "text-white" ),
			} )
				.toEqual( { chosen, heading: true, link: true } )
		}
	})

	it("still draw a stored black on a white page", () => {
		expect(
			both( h( Heading, {
				__component: "text.heading-v1",
				content: "A heading",
				id: 1,
				text_color: "black",
			} as any ) ).light,
		).toContain( "text-black" )
	})
})

/**
 |
 | The declaration the dialog makes, as it reaches the markup. Written out here
 | rather than imported, so that a change to it has to be made in two places
 | and is therefore a decision rather than a slip.
 |
 */
const FORCED_CONTEXT = "--ctx-context-color:var( --color-white )"

/**
 |
 | The colour class on a WYSIWYG's paragraph, on its own. `text-white` is on
 | the forced context's own element in every dark rendering, so a whole-tree
 | assertion would pass with the prose left black.
 |
 */
function prose_class_of ( markup: string ) {
	const found = /<p class="([^"]*)"/.exec( markup )

	return ( found?.[1] ?? "" )
		.split( " " )
		.find( ( name ) => name.startsWith( "text-" ) && name !== "text-p" )
		?? ""
}
