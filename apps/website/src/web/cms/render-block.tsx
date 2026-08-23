
/**
 |
 | The renderer. It walks blocks and nothing else.
 |
 | Three rules, from the render tree's design:
 |
 |   • A block with **one region** finds it under `content`, and receives it as
 |     `children`. There is no rename step and no declaration.
 |
 |   • A block with **more than one region** declares its region names in the
 |     registry, and each arrives as a prop named after the attribute. The
 |     declaration is needed because the attribute-to-prop mapping is a property
 |     of the block, not of the schema.
 |
 |   • A **repeatable component list is never a region.** It arrives as raw data
 |     and the block does what it likes with it. A repeatable entry carries no
 |     `__component`, which is what tells the two apart.
 |
 | An **unknown block does not crash the page.** The catalogue grows in the CMS
 | before it grows here, routinely, for the whole of this build — an editor
 | placing a component the website has not learned yet must cost them a gap on
 | the page and not the page.
 |
 */

import {
	type ReactNode,
	Fragment,
} from "react"

import type { Block } from "./envelope.ts"

import { BLOCK_REGISTRY } from "./block-registry.ts"
import { is_region } from "./regions.ts"

export function render_blocks ( blocks: unknown ): ReactNode {
	if ( !Array.isArray( blocks ) ) {
		return null
	}

	return blocks.map( ( block, index ) => (
		// The id alone is not unique across a region: a dynamic zone draws from
		// several component tables and each hands out its own ids, so a heading
		// and a plain string can both be id 3 and collide as React keys.
		<Fragment key={ `${block?.__component}:${block?.id ?? index}` }>
			{ render_block( block ) }
		</Fragment>
	) )
}

export function render_block ( block: Block | null | undefined ): ReactNode {
	if ( !block || typeof block.__component !== "string" ) {
		return null
	}

	const registered = BLOCK_REGISTRY[block.__component]

	if ( !registered ) {
		return <Unknown_Block name={ block.__component } />
	}

	const { Renderer, regions } = registered

	// `__component` is passed through rather than stripped: a block needs its
	// own identity to look up what root assembly decided about it — its table
	// of contents anchor, for one — and the component name plus the id is what
	// identifies it, because two component tables can hand out the same id.
	if ( regions ) {
		const rendered = Object.fromEntries(
			regions.map( (
				region,
			) => [ region, render_blocks( block[region] ) ] ),
		)

		return <Renderer { ...block } { ...rendered } />
	}

	return (
		<Renderer { ...block }>
			{ is_region( block.content )
				? render_blocks( block.content )
				: null }
		</Renderer>
	)
}

/**
 |
 | Renders nothing a visitor can see, and says so where a developer will look.
 |
 */
function Unknown_Block ( { name }: { name: string } ) {
	if ( import.meta.env.DEV ) {
		console.warn(
			`No block is registered for "${name}". The page rendered without `
				+ `it. Add it to src/web/cms/block-registry.ts.`,
		)
	}

	return <template data-unknown-block={ name } />
}
