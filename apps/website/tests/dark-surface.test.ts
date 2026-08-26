
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

		expect( rendered.light ).toContain( "text-black" )
		expect( rendered.dark ).toContain( "text-white" )
	})

	it("keeps a colour only a person would have typed", () => {
		// `white` and `context` are not defaults of anything, so a stored one
		// is a choice and survives the ground.
		for ( const chosen of [ "white", "context" ] ) {
			const rendered = both(
				h( Wysiwyg, {
					rich_text: PARAGRAPH as any,
					text_color: chosen,
				} ),
			)

			expect( {
				chosen,
				drawn: rendered.dark.includes( `text-${chosen}` ),
			} )
				.toEqual( { chosen, drawn: true } )
		}
	})

	it("does not keep a stored black, because nobody necessarily chose it", () => {
		// The schema's default is `black` and Strapi writes a default into the
		// row **on save**, so every WYSIWYG in the catalogue carries the string
		// whether an editor picked it or not. Respecting it would mean black
		// prose on a black slide — which is what the first seeded dialog
		// actually rendered. See the note in `dark-surface.tsx`.
		const rendered = both(
			h( Wysiwyg, {
				rich_text: PARAGRAPH as any,
				text_color: "black",
			} ),
		)

		expect( rendered.light ).toContain( "text-black" )
		expect( rendered.dark ).toContain( "text-white" )
		expect( rendered.dark ).not.toContain( "text-black" )
	})

	it("draws its subheadings plain white rather than in the context colour", () => {
		const rendered = both( h( Wysiwyg, { rich_text: A_HEADING as any } ) )

		expect( rendered.light ).toContain( "text-context" )
		expect( rendered.dark ).not.toContain( "text-context" )
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
	// Both default to `context`, so an untouched one is legible on black
	// without help. A stored `black` is not — and both are reachable inside
	// the dialog through the image-and-content composite's own region.
	//
	// The URLs are absolute so that `Nav_Link` takes its plain-anchor branch.
	// A site-relative one renders a React Router `<Link>`, which needs a
	// router above it — which is the narrow seam's cost, and the reason the
	// rest of the suite drives HTTP instead.
	const stored_black = ( node: ReactNode ) => both( node ).dark

	it("keep the context colour where nobody chose anything", () => {
		expect(
			both( h( Heading, {
				__component: "text.heading-v1",
				content: "A heading",
				id: 1,
			} as any ) ).dark,
		).toContain( "text-context" )

		expect(
			both( h( Link_Block, {
				label: "A link",
				style: "plain",
				url: "https://example.com/somewhere",
			} as any ) ).dark,
		).toContain( "text-context" )
	})

	it("do not draw a stored black over a dark ground", () => {
		const heading = stored_black( h( Heading, {
			__component: "text.heading-v1",
			content: "A heading",
			id: 1,
			text_color: "black",
		} as any ) )

		expect( heading ).not.toContain( "text-black" )
		expect( heading ).toContain( "text-context" )

		const link = stored_black( h( Link_Block, {
			label: "A link",
			style: "plain",
			text_color: "black",
			url: "https://example.com/somewhere",
		} as any ) )

		expect( link ).not.toContain( "text-black" )
		expect( link ).toContain( "text-context" )
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
