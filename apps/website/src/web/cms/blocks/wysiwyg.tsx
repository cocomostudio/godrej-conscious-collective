
/**
 |
 | WYSIWYG — a leaf, and the one place an editor gets formatting.
 |
 | Its attribute is `rich_text` rather than `content`, so that `content` names a
 | region everywhere in this catalogue and never a string. The renderer only
 | walks a `content` that is an array of blocks, and the distinction is one an
 | attribute name should not be able to blur.
 |
 | **What comes out is what the equivalent components placed by hand would have
 | produced.** A heading here is the heading component's size, weight and
 | element. A paragraph here is the plain string leaf, through the same
 | implementation, and an image is the image leaf. The gaps between them are the
 | gaps the catalogue uses. A visitor should not be able to tell which editor
 | tool made a passage.
 |
 | Headings go through the accessible-headings component like every other heading
 | on the page: the editor's chosen level picks how large it looks, and its rank
 | in the document follows from how deeply this block is nested.
 |
 | # The buttons that lead nowhere
 |
 | The toolbar offers a quotation, a code block and inline code. Each has a
 | treatment of its own in the editor and nowhere at all in this design, so each
 | degrades to ordinary prose rather than introducing a visual language the site
 | has no other use for. **Nothing an editor typed is dropped** — a code block
 | keeps its lines apart, because losing them would turn a list of things into a
 | sentence.
 |
 | # Lists
 |
 | Lifted from the static site's Privacy Policy page, which is the authority on
 | how this is meant to look. A top-level list keeps a plain marker and its
 | indent; a nested one becomes a bordered, light-filled card pulled back to its
 | parent item's text edge, with the site's rhombus marking its points.
 |
 | The rhombus is drawn inline, so it follows the current text colour without
 | being told. The static site renders the symbol to a data URI, hands it to the
 | page as a custom property and applies it as a mask — necessary there, where a
 | page could only pass class strings down, and unnecessary here, where the list
 | item's markup is owned directly.
 |
 | The card is unchanged over a dark ground. That omission is deferred rather
 | than overlooked: nothing in the design asks for a dark treatment yet.
 |
 | # `---`
 |
 | A paragraph whose whole text is exactly `---` is drawn as the horizontal rule
 | leaf, so an editor can put a break in a passage without leaving the text. The
 | match is exact and unforgiving — a leading space, any formatting, or a list
 | item around it all leave it as the three characters an editor typed.
 |
 | **It is the only string this renderer interprets.** Rich text is not markdown
 | and is not parsed as markdown; everything else an editor types reaches the
 | page as typed.
 |
 | # Colour
 |
 | **`text_color` is the colour of the prose** — paragraphs, lists, quotations
 | and code. The headings and links inside keep the page's own colour.
 |
 | The alternative was to colour the whole block, and it was rejected on the
 | shape of the data rather than on taste: this block has drawn two colours
 | since it was written and one enum value cannot say "mixed". Prose is the half
 | the attribute governs because the context colour on a heading or a link is
 | what marks it out as one.
 |
 | **Where nobody answered, the prose is black.** That is this component's own
 | fallback and not the schema's, which says `auto` and declines to choose — a
 | heading and a link fall back to the page's own colour, and this block's prose
 | to black, because that is what each has always drawn. See
 | `blocks/text-color.ts`.
 |
 | **The cost is real and worth naming**: a block set to `white` draws its
 | subheadings in the context colour, and an editor cannot say otherwise. If
 | that shows up in a design, the fix is the whole block following the
 | attribute and a one-off migration writing `context` onto every WYSIWYG that
 | predates it — not a second attribute.
 |
 */

import {
	type BlocksContent,
	BlocksRenderer,
} from "@strapi/blocks-react-renderer"
import {
	type ReactNode,
	createContext,
	use,
} from "react"

import { H } from "#infra/lib/ui/react/headings.tsx"
import { Rounded_Rhombus } from "#infra/lib/ui/react/icons/rounded-rhombus.tsx"

import type { Media } from "../envelope.ts"

import { use_text_colour_class } from "../dark-surface.tsx"
import { Nav_Link } from "../nav-link.tsx"
import { use_body_text_class } from "../page-layout.tsx"

import type { Text_Color } from "./text-color.ts"

import { BLOCK_SPACING } from "./block-spacing.ts"
import { heading_size_class } from "./heading.tsx"
import { Horizontal_Rule } from "./horizontal-rule.tsx"
import { Image } from "./image.tsx"
import { Prose_Paragraph } from "./prose-paragraph.tsx"
import { with_nested_lists_normalised } from "./rich-text-nesting.ts"

/**
 |
 | The gap above a heading.
 |
 | Every gap in a passage is sixteen pixels, at every breakpoint, with no
 | responsive bump — a long document should not become airier or tighter
 | depending on what a visitor is holding. Two consecutive headings are the one
 | exception, because a heading introducing a run that opens with another heading
 | has to read as the senior of the two.
 |
 | **That exception is a sibling selector and there is no other way to say it.**
 | The renderer hands each node to its component alone, so a heading cannot be
 | told what precedes it; `rich-heading` is the mark that lets the one following
 | another find it in the markup.
 |
 */
const HEADING_GAP =
	"rich-heading mt-4 [.rich-heading+&]:mt-6 md:[.rich-heading+&]:mt-8"

/**
 |
 | The static site's list treatment.
 |
 | The nested card's `-ml-5` answers the parent list's `pl-5`, which is what
 | lands its left edge on the parent item's words rather than on its marker. The
 | two numbers are one decision and have to move together.
 |
 */
const LIST = "mt-4 pl-5 space-y-4"
const NESTED_LIST =
	"my-6 md:my-8 -ml-5 px-4 py-8 space-y-4 border border-gray-dark rounded-lg bg-gray-light"
// A numbered card needs room for its numerals inside the card's own padding.
const NESTED_NUMBERS = "list-decimal pl-9"
const RHOMBUS_ITEM = "relative pl-5 md:pl-6"
const RHOMBUS =
	"absolute left-0 top-[0.25em] md:top-[0.15em] size-[1em] md:size-[1.25em]"

/**
 |
 | Whether there is a list above the one being drawn, and whether its items
 | carry a rhombus.
 |
 | A list's markup depends on the list around it, and a list item's on the list
 | it is in — neither of which the renderer gives a component any way to ask
 | about. Nesting is normalised to one level before any of this renders, so
 | "inside a list" and "nested" are the same question.
 |
 */
type List_Scope = {
	inside_a_list: boolean
	rhombus: boolean
}

const List_Scope_Context = createContext<List_Scope>( {
	inside_a_list: false,
	rhombus: false,
} )

/**
 |
 | The rich text as the renderer should see it.
 |
 | Three pure passes and no more, all of them things the renderer cannot do for
 | itself once a node is in front of it: lists put where HTML says they go, the
 | empty paragraphs dropped, and the one shorthand recognised.
 |
 */
function prepared_rich_text ( rich_text: BlocksContent ): BlocksContent {
	return with_nested_lists_normalised( rich_text )
		.filter( ( node ) => !is_empty_paragraph( node ) )
		.map( ( node ) => is_rule( node ) ? as_a_rule( node ) : node )
}

type Top_Level_Node = BlocksContent[number]
type Paragraph = Extract<Top_Level_Node, { type: "paragraph" }>

/**
 |
 | What the paragraph component is handed.
 |
 | `horizontal_rule` is the flag `as_a_rule` writes, and it has to be declared
 | here because the renderer package's own props type describes the nodes Strapi
 | stores rather than the ones this file prepares.
 |
 */
type Paragraph_Props = {
	children?: ReactNode
	horizontal_rule?: boolean
}

/**
 |
 | **An empty paragraph is dropped rather than hidden.** A hidden node still
 | counts as the first child, and would take the collapsed top margin meant for
 | the first paragraph a visitor can see. Only the wholly empty one goes: a line
 | break inside a paragraph is something an editor meant.
 |
 */
function is_empty_paragraph ( node: Top_Level_Node ) {
	return node.type === "paragraph"
		&& node.children.every(
			( child ) => child.type === "text" && child.text === "",
		)
}

const RULE = "---"

function is_rule ( node: Top_Level_Node ) {
	if ( node.type !== "paragraph" || node.children.length !== 1 ) {
		return false
	}

	const [ only ] = node.children

	// Exact, and unforgiving on purpose. No trimming, so a leading space leaves
	// it as text, and any formatting an editor applied disqualifies it.
	//
	// Formatting is asked about by value rather than by counting the node's
	// keys, because a modifier an editor turned ON and then OFF again can be
	// left behind as `false` — which is a key on the node and is not formatting.
	return only.type === "text"
		&& only.text === RULE
		&& !modifiers_on( only )
}

function modifiers_on ( text_node: object ) {
	return Object.entries( text_node )
		.some( ( [ key, value ] ) =>
			key !== "text" && key !== "type" && value
		)
}

/**
 |
 | The paragraph, marked for the paragraph component to draw as a rule.
 |
 | Rich text has no horizontal rule node and inventing a node type would put a
 | value in the tree that neither the CMS nor the renderer package knows. A flag
 | on the paragraph reaches the component instead: everything on a node but its
 | type and its children arrives as a prop.
 |
 */
function as_a_rule ( node: Top_Level_Node ): Top_Level_Node {
	return { ...node as Paragraph, horizontal_rule: true } as Top_Level_Node
}

type Wysiwyg_Props = {
	rich_text?: BlocksContent
	text_color?: Text_Color
}

export function Wysiwyg ( { rich_text, text_color }: Wysiwyg_Props ) {
	// `auto` and an unset value both land on the fallback, and the fallback is
	// this block's own — see the Colour section above. Over a dark ground every
	// word is white whatever an editor stored, per `dark-surface.tsx`.
	const prose = use_text_colour_class( text_color, "black" )

	if ( !Array.isArray( rich_text ) || rich_text.length === 0 ) {
		return null
	}

	return <div
		className={ `${BLOCK_SPACING} [&>*:first-child]:mt-0` }>
		<BlocksRenderer
			content={ prepared_rich_text( rich_text ) }
			blocks={ {
				// A code block is prose. Its children still carry the line
				// breaks an editor typed, and the paragraph keeps them, so a
				// block of separate lines does not run together — nor does it
				// gain sixteen pixels between every line, which separate
				// paragraphs would.
				code: ( { children } ) =>
					<Prose_Paragraph colour={ prose }>
						{ children }
					</Prose_Paragraph>,
				// The headings inside rich text are the context colour,
				// which is what marks them out as headings. Inside the
				// dialog the context colour is itself forced to white, so
				// the one class is right in both places and there is
				// nothing here to ask about the ground.
				heading: ( { children, level } ) =>
					<H
						className={ `${HEADING_GAP} ${
							heading_size_class( level )
						} md:font-semibold text-context` }>
						{ children }
					</H>,
				image: ( { image } ) =>
					// The renderer's own image node is the upload's row,
					// which is what the media helper wants — the two types
					// describe the same thing and neither package knows the
					// other's name for it. No caption: the row carries the
					// one an editor gave the file in the media library, which
					// is not a caption they wrote for this passage.
					<Image file={ image as unknown as Media } />,
				link: ( { children, url } ) =>
					<Nav_Link
						className="text-context underline underline-offset-3"
						url={ url }>
						{ children }
					</Nav_Link>,
				list: ( { children, format } ) =>
					<List colour={ prose } format={ format }>
						{ children }
					</List>,
				"list-item": ( { children } ) =>
					<List_Item>
						{ children }
					</List_Item>,
				paragraph: (
					{ children, horizontal_rule }: Paragraph_Props,
				) => horizontal_rule
					? <Horizontal_Rule />
					: <Prose_Paragraph colour={ prose }>
						{ children }
					</Prose_Paragraph>,
				// A quotation is prose, drawn as any other paragraph is. The
				// quote component is a leaf of its own and is untouched by
				// this; only the button in the editor's toolbar is.
				quote: ( { children } ) =>
					<Prose_Paragraph colour={ prose }>
						{ children }
					</Prose_Paragraph>,
			} }
			modifiers={ {
				bold: ( { children } ) =>
					<strong className="font-semibold">
						{ children }
					</strong>,
				// Inline code passes through as words. There is no monospaced
				// typeface anywhere in this design, and a run of words set in
				// one would read as machine output.
				code: ( { children } ) => <>{ children }</>,
				italic: ( { children } ) =>
					<em className="italic">
						{ children }
					</em>,
				strikethrough: ( { children } ) => <s>{ children }</s>,
				underline: ( { children } ) => <u>{ children }</u>,
			} } />
	</div>
}

type List_Props = {
	children: ReactNode
	colour: string
	format?: string
}

/**
 |
 | **The nested card names neither a size nor a colour**, because it sits inside
 | the list above it and inherits both. That is what the static site does, and it
 | is also what keeps the card's own border and fill out of the argument about
 | what a block's colour governs.
 |
 */
function List ( { children, colour, format }: List_Props ) {
	const body_size = use_body_text_class()
	const nested = use( List_Scope_Context ).inside_a_list
	const ordered = format === "ordered"

	const classes = [
		nested ? NESTED_LIST : `${LIST} ${body_size} ${colour}`,
		ordered ? ( nested ? NESTED_NUMBERS : "list-decimal" ) : "",
		nested || ordered ? "" : "list-disc",
	].filter( Boolean ).join( " " )

	return <List_Scope_Context
		value={ { inside_a_list: true, rhombus: nested && !ordered } }>
		{ ordered
			? <ol className={ classes }>{ children }</ol>
			: <ul className={ classes }>{ children }</ul> }
	</List_Scope_Context>
}

/**
 |
 | An item, with the rhombus its list asked for.
 |
 | The marker is hidden from assistive technology: a list is already announced
 | as a list, and a decoration that follows the text colour is decoration.
 |
 */
function List_Item ( { children }: { children: ReactNode } ) {
	if ( !use( List_Scope_Context ).rhombus ) {
		return <li>{ children }</li>
	}

	return <li className={ RHOMBUS_ITEM }>
		<Rounded_Rhombus aria-hidden="true" className={ RHOMBUS } />
		{ children }
	</li>
}
