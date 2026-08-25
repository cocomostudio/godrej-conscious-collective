
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
 | **On a one-column page a section is full-width, and holds the grid itself.**
 | The background reaches both edges of the window, and the twelve-column
 | container is introduced inside the padding so that the words still line up
 | with the grid. A block that has to run off those edges — a looping carousel,
 | the ticker — asks `section-frame.tsx` for the margins that take it back out.
 | On a two-column page none of that applies: the main column is already the
 | container.
 |
 | **A section holding nothing but padding-free blocks lays down no padding**,
 | which is the ticker's case. That decision is here rather than in the block
 | because a negative margin on a child is clamped at the padding box: padding
 | can only be declined where it is laid down. `section-frame.tsx` names which
 | blocks ask for it.
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
import {
	SECTION_CONTAINER,
	section_padding,
	sheds_padding,
} from "./section-frame.tsx"

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
	/**
	 |
	 | The section's own region, unrendered, alongside the rendered copy of it
	 | that arrives as `children`.
	 |
	 | Read for one question and no other: whether everything in here is a block
	 | that leaves no space around itself, which decides whether this section
	 | pads at all. That cannot be asked of `children` — a rendered region is
	 | nodes with no blocks behind them — and it cannot be asked from inside the
	 | block either, because padding is undone where it is laid down.
	 |
	 */
	content?: unknown
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
		content,
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

	const padding = sheds_padding( {
			content,
			has_words: Boolean( heading?.content || section_link ),
		} )
		? ""
		: section_padding( { horizontal_rule, one_column } )

	return <section
		className={ `scroll-mt-4 ${
			background
				? ""
				: "[&:first-child>div]:pt-0 [&:last-child>div]:pb-0"
		}` }
		id={ anchor }
		style={ background }>
		{ horizontal_rule
			&& <hr className="border-0 border-t-2 border-gray-light" /> }

		<div className={ padding }>
			<div className={ one_column ? SECTION_CONTAINER : "" }>
				{ heading?.content
					? <Heading
						__component="text.heading-v1"
						id={ heading.id }
						content={ heading.content }
						level={ heading.level }
						link={ section_link } />
					: section_link && <Link_Block { ...section_link } /> }

				{ heading?.content && opening_line
					&& <p className="mt-4 text-p text-black">
						{ opening_line }
					</p> }

				<Level>{ children }</Level>
			</div>
		</div>
	</section>
}
