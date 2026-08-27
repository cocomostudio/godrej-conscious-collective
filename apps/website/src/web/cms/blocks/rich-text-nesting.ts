
/**
 |
 | Nested lists, moved to where HTML says they go.
 |
 | **Strapi stores a nested list as a sibling of the list items rather than as a
 | child of one.** Handed to a renderer unchanged, that is a `<ul>` drawn
 | directly inside a `<ul>`. Such markup is not valid, and browsers lay it out as
 | a runaway indent rather than as a nested list. The defect is a known one in
 | the renderer package, and not a fault in what an editor typed.
 |
 | The fix re-parents each nested list into the list item preceding it. That
 | produces both valid markup and exactly the shape the static site writes by
 | hand — a `<ul>` inside the `<li>` it belongs under — so the treatment can be
 | lifted from there without translation.
 |
 | **A list opening with a nested list is given an empty item to hold it.** There
 | is nothing above it to adopt it, and promoting it a level would silently
 | change what an editor wrote into something else.
 |
 | **One level of nesting is supported, and deeper lists are lifted into it in
 | document order.** An editor who over-indents loses the indentation and never
 | the words: every item of every deeper list becomes an item of the first nested
 | list, in the order it was written.
 |
 | A pure function of the rich text, in a module of its own, because the shape of
 | the tree is a separate question from how any of it is drawn. It is verified
 | through the rendered result rather than through a seam here — see the website's
 | rich-text suite.
 |
 | The local node types below describe the tree honestly. The renderer package's
 | own types say a list item holds inline nodes only, which is precisely the
 | shape this module exists to correct, so they cannot be used to write down
 | either the input or the output.
 |
 */

import type { BlocksContent } from "@strapi/blocks-react-renderer"

type Rich_Node = {
	type: string
	children?: Rich_Node[]
	format?: string
}

type List_Node = Rich_Node & { type: "list"; children: Rich_Node[] }

export function with_nested_lists_normalised (
	rich_text: BlocksContent,
): BlocksContent {
	return ( rich_text as unknown as Rich_Node[] )
		.map( ( node ) => is_list( node ) ? normalised( node ) : node )
		.filter( ( node ) =>
			!is_empty_list( node )
		) as unknown as BlocksContent
}

function is_list ( node: Rich_Node ): node is List_Node {
	return node.type === "list" && Array.isArray( node.children )
}

function is_empty_list ( node: Rich_Node ) {
	return is_list( node ) && node.children.length === 0
}

/**
 |
 | A top-level list with every nested list moved inside the item above it.
 |
 */
function normalised ( list: List_Node ): List_Node {
	const items: Rich_Node[] = []

	// An item to hang a nested list on. A list may open with one, in which
	// case there is nothing to hang it on yet and an empty item is made.
	const host = () => {
		if ( items.length === 0 ) {
			items.push( { children: [], type: "list-item" } )
		}

		return items[items.length - 1]
	}

	const adopt = ( nested: List_Node ) => {
		if ( nested.children.length === 0 ) {
			return
		}

		const holder = host()

		holder.children = [ ...holder.children ?? [], nested ]
	}

	for ( const child of list.children ) {
		if ( is_list( child ) ) {
			adopt( { ...child, children: lifted( child ) } )
			continue
		}

		// A list item may already hold a list of its own — nothing Strapi
		// writes, but the shape this module produces, so reading it back is
		// the difference between a pure function and one that may only be
		// applied once.
		const [ inline, nested ] = split_out_lists( child.children ?? [] )

		items.push( { ...child, children: inline } )

		for ( const list_below of nested ) {
			adopt( { ...list_below, children: lifted( list_below ) } )
		}
	}

	return { ...list, children: items }
}

/**
 |
 | Every item of a nested list, with the items of anything nested deeper folded
 | in beside them in document order. This is where the extra indentation goes
 | and where none of the words do.
 |
 */
function lifted ( list: List_Node ): Rich_Node[] {
	const items: Rich_Node[] = []

	for ( const child of list.children ) {
		if ( is_list( child ) ) {
			items.push( ...lifted( child ) )
			continue
		}

		const [ inline, nested ] = split_out_lists( child.children ?? [] )

		items.push( { ...child, children: inline } )

		for ( const list_below of nested ) {
			items.push( ...lifted( list_below ) )
		}
	}

	return items
}

function split_out_lists ( children: Rich_Node[] ) {
	return [
		children.filter( ( child ) => !is_list( child ) ),
		children.filter( is_list ),
	] as [ Rich_Node[], List_Node[] ]
}
