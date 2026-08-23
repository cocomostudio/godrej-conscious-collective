
/**
 |
 | The table of contents.
 |
 | Flat, never nested. Fed by sections and by headings that opted in, in
 | document order, computed here while the root is assembled — the whole tree
 | has already been fetched, so this costs a walk and no request.
 |
 | Anchors are handed to the blocks through a context rather than stamped onto
 | the tree, because everything below the root arrives ready to walk and stays
 | that way. A block looks its own anchor up by identity; two components can
 | share a numeric id across their two tables, so identity is the component name
 | and the id together.
 |
 */

import type { Block } from "./envelope.ts"

import { is_region } from "./regions.ts"

export type Toc_Entry = {
	anchor: string
	label: string
}

export type Table_Of_Contents = {
	entries: Toc_Entry[]
	/** Keyed by `block_key`, so a block can find the anchor it was given. */
	anchors: Record<string, string>
}

export const EMPTY_TABLE_OF_CONTENTS: Table_Of_Contents = {
	anchors: {},
	entries: [],
}

const SECTION = "container.section-v1"
const HEADING = "text.heading-v1"

/**
 |
 | A section's own heading, as a block.
 |
 | It is stored as a component attribute, so it carries no discriminator of its
 | own — the schema already says what it is. One is put back here so that the
 | heading has the same identity the renderer gives it when it looks its anchor
 | up.
 |
 */
function section_heading ( section: Block ): Block | null {
	const heading = section.heading as Record<string, unknown> | null

	if ( !heading ) {
		return null
	}

	return { ...heading, __component: HEADING } as Block
}

export function block_key ( block: Block ) {
	return `${block.__component}:${block.id ?? ""}`
}

/**
 |
 | Walks a region in document order, collecting whatever opted in.
 |
 | A section carries its own `title` for this, deliberately separate from the
 | heading it displays: the two say different things, and the table of contents
 | wants the shorter one.
 |
 */
export function collect_table_of_contents (
	blocks: Block[],
): Table_Of_Contents {
	const entries: Toc_Entry[] = []
	const anchors: Record<string, string> = {}
	const taken = new Set<string>()

	const add = ( block: Block | null, label: unknown ) => {
		if ( !block || block.register_with_toc !== true ) {
			return
		}

		if ( typeof label !== "string" || label.trim() === "" ) {
			return
		}

		const anchor = unique( slugify( label ), taken )

		anchors[block_key( block )] = anchor
		entries.push( { anchor, label } )
	}

	const walk = ( nodes: Block[] ) => {
		for ( const node of nodes ) {
			if ( node.__component === SECTION ) {
				add( node, node.title )
				// A section may also carry a heading of its own, as an
				// ordinary component attribute rather than a zone entry. That
				// heading has its own opt-in, and an editor who turns it on
				// means it — so it is visited too, even though the walk never
				// reaches it.
				add(
					section_heading( node ),
					section_heading( node )?.content,
				)
			} else {
				add( node, node.content )
			}

			if ( is_region( node.content ) ) {
				walk( node.content )
			}
		}
	}

	walk( blocks )

	return { anchors, entries }
}

function slugify ( label: string ) {
	const slug = label
		.toLowerCase()
		.normalize( "NFKD" )
		.replace( /[\u0300-\u036f]/g, "" )
		.replace( /[^a-z0-9]+/g, "-" )
		.replace( /^-+|-+$/g, "" )

	return slug === "" ? "section" : slug
}

/**
 |
 | Two sections may legitimately share a title. The second one takes a numeric
 | suffix rather than silently pointing at the first.
 |
 */
function unique ( slug: string, taken: Set<string> ) {
	if ( !taken.has( slug ) ) {
		taken.add( slug )
		return slug
	}

	let suffix = 2

	while ( taken.has( `${slug}-${suffix}` ) ) {
		suffix += 1
	}

	const unique_slug = `${slug}-${suffix}`
	taken.add( unique_slug )

	return unique_slug
}
