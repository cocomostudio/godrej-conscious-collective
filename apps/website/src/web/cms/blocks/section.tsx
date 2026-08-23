
/**
 |
 | Section — the only thing an editor may place directly in a main region,
 | because background, spacing and anchoring all live here.
 |
 | **Spacing is padding, never margin.** Sections carry backgrounds, and a
 | margin between two filled sections renders as a strip of nothing between two
 | blocks of colour. A section with no background of its own does collapse its
 | outer padding against the column's, because there is nothing there to leave a
 | strip of.
 |
 | Padding is greater on a one-column page than on a two-column one: a
 | one-column page has the whole width and the design opens it up to match.
 |
 | Its `title` is not shown. The title names the section in the table of
 | contents; the heading is what a reader sees.
 |
 | **Two cross-field rules, neither enforced at save time.** An opening line
 | with no heading above it is not rendered, and where both this section and its
 | heading carry a link, the heading's is the one shown — it sits nearer the
 | thing it labels. Both are stated in the admin instead of validated, because a
 | section sits inside a dynamic zone: a validation failure would name a
 | position rather than a section an editor recognises, and would refuse the
 | whole entry over a presentational rule.
 |
 */

import type { ReactNode } from "react"

import { Level } from "#infra/lib/ui/react/headings.tsx"

import type {
	Block,
	Link as Link_Attribute,
} from "../envelope.ts"

import { use_anchor } from "../anchors.tsx"
import { use_page_layout } from "../page-layout.tsx"
import { section_background } from "../section-backgrounds.ts"
import { Heading } from "./heading.tsx"
import { Link_Block } from "./link.tsx"

type Section_Heading = {
	id?: number
	content: string
	level?: string
	link?: Link_Attribute | null
}

type Section_Props = Pick<Block, "__component" | "id"> & {
	title: string
	/**
	 |
	 | An ordinary component attribute rather than a region, so it is rendered
	 | directly rather than walked to. Nothing invents a `__component` for it:
	 | the schema already says what it is.
	 |
	 */
	heading?: Section_Heading | null
	opening_line?: string | null
	link?: Link_Attribute | null
	background_gradient?: string
	background_pattern?: string
	background_position?: string
	horizontal_rule?: boolean
	children: ReactNode
}

export function Section (
	{
		__component,
		background_gradient = "none",
		background_pattern = "none",
		background_position = "left",
		children,
		heading,
		horizontal_rule = false,
		id,
		link,
		opening_line,
	}: Section_Props,
) {
	const anchor = use_anchor( { __component, id } )
	const one_column = use_page_layout() === "one-column"

	const background = section_background( {
		gradient: background_gradient,
		pattern: background_pattern,
		position: background_position,
	} )

	// The heading's link wins over the section's, because it sits nearer the
	// thing it labels. With no heading at all there is nothing to lose to, so
	// the section's own link still renders — the drop rule is the opening
	// line's alone.
	const section_link = heading?.link?.url ? heading.link : link

	return <section
		className={ `scroll-mt-4 ${background ? "" : "first:pt-0 last:pb-0"}` }
		id={ anchor }
		style={ background }>
		{ horizontal_rule
			&& <hr className="border-0 border-t-2 border-gray-light" /> }

		<div
			className={ `${padding( { horizontal_rule, one_column } )}` }>
			{ heading?.content
				? <Heading
					__component="text.heading-v1"
					id={ heading.id }
					content={ heading.content }
					level={ heading.level }
					link={ section_link } />
				: section_link && <Link_Block { ...section_link } /> }

			{ heading?.content && opening_line
				&& <p className="mt-4 text-p text-black">{ opening_line }
				</p> }

			<Level>{ children }</Level>
		</div>
	</section>
}

/**
 |
 | A section that draws a rule above itself sits closer to the one before it:
 | the line is already doing the separating, and the full gap on top of it reads
 | as a stranded rule rather than as a division.
 |
 */
function padding (
	{ horizontal_rule, one_column }: {
		horizontal_rule: boolean
		one_column: boolean
	},
) {
	const bottom = one_column ? "pb-12 md:pb-16" : "pb-6 md:pb-8"

	if ( horizontal_rule ) {
		return `pt-3 md:pt-4 ${bottom}`
	}

	return `${one_column ? "pt-12 md:pt-16" : "pt-6 md:pt-8"} ${bottom}`
}
