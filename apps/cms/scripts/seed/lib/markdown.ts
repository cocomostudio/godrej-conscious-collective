
/**
 |
 | Markdown, turned into rich text, for the seed and for nothing else.
 |
 | Sample content that exercises headings, lists, nesting and inline formatting
 | is unreadable written as Strapi's node tree by hand, and unreviewable in a
 | diff. It is written as markdown instead, and this is the one thing that reads
 | it.
 |
 | **It is a development-only dependency and it stays one.** Nothing at render
 | time parses markdown: the website interprets exactly one string, `---`, and
 | treats everything else an editor types as typed. A markdown implementation
 | reachable from a request would be a second, silent formatting language.
 |
 | The parse is markdown to AST to rich text, on remark's core utility rather
 | than on anything that emits HTML, so there is no markup string in between to
 | be re-read.
 |
 | ─── THE SUPPORTED SUBSET ───────────────────────────────────────────────────
 |
 | Headings, paragraphs, bulleted and numbered lists to any depth, images,
 | links, bold, italic and inline code — which is what rich text can hold and
 | what the website draws. **Everything outside it throws.** Tables, inline
 | HTML, block quotations, code blocks and footnotes stop the seed where they
 | are written rather than being dropped into a page nobody looks at again.
 | Seed content is written in this repository, so a syntax error here is a bug
 | to fix rather than input to tolerate.
 |
 | ─── THE TWO DIVERGENCES FROM COMMONMARK ────────────────────────────────────
 |
 |   • **Setext headings are off.** A line of dashes beneath a line of text
 |     turning that text into a heading is the one markdown rule that changes
 |     the meaning of the line above it, and a writer reaching for a rule would
 |     never see it happen. With it off, that line of dashes is the rule they
 |     were reaching for, blank line above it or not.
 |
 |   • **Every newline inside a paragraph is a hard break.** Markdown's own
 |     spellings for one — two trailing spaces, or a trailing backslash — are
 |     not used: the repository's formatter strips trailing whitespace, so the
 |     first would fail invisibly. The newline is emitted inside the text node,
 |     which is what the website already draws as a line break.
 |
 | ─── THE RULE ───────────────────────────────────────────────────────────────
 |
 | Rich text has no horizontal rule node, so a rule is emitted as a paragraph
 | whose whole text is the literal `---` — which is the one string the website
 | interprets. The seed and the renderer meet on it.
 |
 */

import { fromMarkdown } from "mdast-util-from-markdown"

import type {
	Image as Mdast_Image,
	List as Mdast_List,
	ListItem as Mdast_Item,
	Nodes as Mdast_Node,
	PhrasingContent,
	RootContent,
} from "mdast"

/**
 |
 | A rich-text node, as Strapi stores it.
 |
 | Deliberately loose. What comes out of here is handed straight to the document
 | service, which takes `any`, and spelling the node types out would be a second
 | copy of a shape the renderer package already declares — one that nothing
 | checks against the first and that drifts the moment either moves.
 |
 */
export type Rich_Node = Record<string, unknown>

/** What the website reads as a horizontal rule. */
const RULE = "---"

/**
 |
 | Turning setext headings off.
 |
 | A micromark syntax extension that names a construct under `disable` rather
 | than adding one. `setextUnderline` is the construct's own name, and with it
 | gone the `=` form falls back to being text and the `-` form to being a
 | thematic break.
 |
 */
const SETEXT_HEADINGS_OFF = { disable: { null: [ "setextUnderline" ] } }

/**
 |
 | The timestamps a media row carries, on a row that was never uploaded.
 |
 | A fixed instant rather than the moment the seed ran: nothing reads it, and a
 | value that changes on every run would make two seeds of the same content
 | differ.
 |
 */
const NOT_UPLOADED = "1970-01-01T00:00:00.000Z"

/** The types the seed's own pictures come in. Anything else falls back. */
const MIME_TYPES: Record<string, string> = {
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".svg": "image/svg+xml",
}

/**
 |
 | A line made only of pipes, dashes, colons and spaces is a table's delimiter
 | row and nothing else.
 |
 | Tables are looked for in the source rather than in the tree, because without
 | a GFM extension the parser never builds a table node — it builds a paragraph
 | holding the pipes, which would reach a page looking like what it is. The
 | point of refusing tables is that they are not silently mangled, so the
 | refusal has to happen where the mangling would.
 |
 */
function is_a_table_delimiter ( line: string ) {
	return /^[\s|:-]+$/.test( line )
		&& line.includes( "|" )
		&& line.includes( "-" )
}

export function rich_text_from_markdown ( source: string ): Rich_Node[] {
	const table = source.split( "\n" ).findIndex( is_a_table_delimiter )

	if ( table !== -1 ) {
		throw new Error(
			`Markdown tables are not supported, and one is on line ${
				table + 1
			}. Rich text has no table node.`,
		)
	}

	const tree = fromMarkdown( source, { extensions: [ SETEXT_HEADINGS_OFF ] } )

	return tree.children.flatMap( node_from )
}

/** One top-level node. */
function node_from ( node: RootContent ): Rich_Node[] {
	switch ( node.type ) {
		case "heading":
			return [ {
				children: inline_from( node.children ),
				level: node.depth,
				type: "heading",
			} ]

		case "list":
			return [ list_from( node ) ]

		case "paragraph":
			return [ paragraph_from( node.children ) ]

		// Rich text has no rule node, so the rule is the literal three
		// characters in a paragraph — which is the one string the website
		// reads back. The seed and the renderer meet on it.
		case "thematicBreak":
			return [ { children: [ text_from( RULE ) ], type: "paragraph" } ]

		default:
			throw unsupported( node )
	}
}

/**
 |
 | A paragraph, or the picture that was written as one.
 |
 | Rich text files an image at the top level rather than inside a paragraph,
 | which is where markdown puts it, so `![…](…)` alone on its line comes back
 | out one level up. A picture written amongst words has nowhere to go and says
 | so.
 |
 */
function paragraph_from ( children: PhrasingContent[] ): Rich_Node {
	const picture = children.find( ( child ) => child.type === "image" )

	if ( !picture ) {
		return { children: inline_from( children ), type: "paragraph" }
	}

	if ( children.length !== 1 ) {
		throw new Error(
			"An image has to be alone on its line. Rich text holds a picture "
				+ "as a block of its own and cannot put one inside a sentence.",
		)
	}

	return {
		children: [ text_from( "" ) ],
		image: media_row_for( picture ),
		type: "image",
	}
}

/**
 |
 | A picture, described the way rich text insists on being told.
 |
 | **This is the one place in the seed where a bare address is not enough.**
 | Every other picture is one, because the image component carries a `url`
 | beside its `file` so that no binary has to live in this repository. Rich text
 | has no such escape: its image node holds the media library's own row, and
 | Strapi refuses the write unless every field of one is there — the name, the
 | extension, the type, a hash, a byte count and two timestamps.
 |
 | So the fields that describe a picture are filled from the picture, and the
 | ones only an uploaded file could answer are filled with what is true of this
 | one: it is not in the library, its bytes were never counted here, and nothing
 | reads them. The website draws it from `url` and from nothing else.
 |
 | The alternative was uploading, which is what the two attributes with no `url`
 | sibling do — see `uploads.ts`. It was not worth it for sample content: either
 | a picture is fetched, which puts somebody else's uptime between this seed and
 | the test suite that runs it, or one is generated, and a grey rectangle in the
 | middle of a passage is worse than the photograph this points at.
 |
 */
function media_row_for ( picture: Mdast_Image ) {
	const { url } = picture
	const name = url.split( "/" ).pop() || "picture"
	const dot = name.lastIndexOf( "." )
	const extension = dot === -1 ? "" : name.slice( dot )

	return {
		alternativeText: picture.alt ?? "",
		// A markdown title is the media library's own caption. The website
		// deliberately draws no caption for a picture inside a passage, but
		// what was written is still written down.
		caption: picture.title ?? null,
		createdAt: NOT_UPLOADED,
		ext: extension === "" ? ".jpg" : extension,
		// Strapi wants a hash; there is no file here to have one. The name is
		// what a hash of an upload is derived from, so it is what stands in.
		hash: dot === -1 ? name : name.slice( 0, dot ),
		height: 0,
		mime: MIME_TYPES[extension] ?? "image/jpeg",
		name,
		provider: "url",
		size: 0,
		updatedAt: NOT_UPLOADED,
		url,
		width: 0,
	}
}

/**
 |
 | A list, and the lists inside it.
 |
 | **Strapi files a nested list beside the item it belongs under rather than
 | inside it**, and this writes what Strapi stores. Depth is kept whatever it
 | is: flattening past one level is the website's rule and is applied where the
 | page is drawn, so a seed that flattened here would hide the content written
 | to exercise it.
 |
 */
function list_from ( node: Mdast_List ): Rich_Node {
	return {
		children: node.children.flatMap( item_from ),
		format: node.ordered ? "ordered" : "unordered",
		type: "list",
	}
}

function item_from ( item: Mdast_Item ): Rich_Node[] {
	const words: Rich_Node[] = []
	const nested: Rich_Node[] = []

	for ( const child of item.children ) {
		if ( child.type === "list" ) {
			nested.push( list_from( child ) )
			continue
		}

		if ( child.type !== "paragraph" ) {
			throw unsupported( child )
		}

		// A second paragraph in one item is another line of the same item: a
		// list item holds words rather than blocks, so the only place for it is
		// after a break.
		if ( words.length > 0 ) {
			words.push( text_from( "\n" ) )
		}

		words.push( ...inline_from( child.children ) )
	}

	return [ { children: words, type: "list-item" }, ...nested ]
}

/** The formatting an editor marked a run of words with. */
type Marks = Record<string, true>

function inline_from (
	children: PhrasingContent[],
	marks: Marks = {},
): Rich_Node[] {
	return children.flatMap( ( child ): Rich_Node[] => {
		switch ( child.type ) {
			case "break":
				return [ text_from( "\n", marks ) ]

			case "emphasis":
				return inline_from( child.children, {
					...marks,
					italic: true,
				} )

			case "inlineCode":
				return [ text_from( child.value, { ...marks, code: true } ) ]

			case "link":
				return [ {
					children: inline_from( child.children, marks ),
					type: "link",
					url: child.url,
				} ]

			case "strong":
				return inline_from( child.children, {
					...marks,
					bold: true,
				} )

			case "text":
				return [ text_from( child.value, marks ) ]

			default:
				throw unsupported( child )
		}
	} )
}

function text_from ( text: string, marks: Marks = {} ): Rich_Node {
	return { text, type: "text", ...marks }
}

function unsupported ( node: Mdast_Node ) {
	const line = node.position?.start.line

	return new Error(
		`Unsupported markdown: ${node.type}`
			+ ( line === undefined ? "" : ` on line ${line}` )
			+ ". The seed writes headings, paragraphs, lists, images, links "
			+ "and inline formatting, and refuses the rest rather than "
			+ "dropping it.",
	)
}
