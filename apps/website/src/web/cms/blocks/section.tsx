
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
 | **Padding at each edge is a decision two parties can veto.** The section's
 | own `spacing_around` is one; the `spacing_around` of the block at that edge
 | is the other. Either can decline the space and neither can put it back, which
 | is how the ticker butts against its neighbours and how the schedule list sits
 | flush to the top of the page it opens. The decision is here rather than in
 | the block because a negative margin on a child is clamped at the padding box:
 | padding can only be declined where it is laid down. See `section-frame.tsx`.
 |
 | Its `title` is not shown. The title names the section in the table of
 | contents; the heading is what a reader sees.
 |
 | Its `opening_line` is a **plain string component**, not a bare line of text,
 | so it answers for its own colour the way every other run of words in the
 | catalogue does. It is rendered by the same block an editor would have placed
 | by hand — there is one plain string on this site, not two.
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

import type { Spacing_Around } from "./block-spacing.ts"
import type { Text_Color } from "./text-color.ts"

import { use_anchor } from "../anchors.tsx"
import { use_page_layout } from "../page-layout.tsx"
import { section_background } from "../section-backgrounds.ts"
import { Heading } from "./heading.tsx"
import { Link_Block } from "./link.tsx"
import { Plain_String } from "./plain-string.tsx"
import {
	pads_at_bottom,
	pads_at_top,
	SECTION_CONTAINER,
	section_padding,
} from "./section-frame.tsx"

type Section_Heading = {
	id?: number
	content: string
	level?: string
	link?: Link_Attribute | null
	text_color?: Text_Color
}

/**
 |
 | The section's opening line, as the plain string component it now is.
 |
 | An ordinary component attribute, so it arrives without a `__component` — the
 | schema already says what it is, and nothing here invents one for it.
 |
 */
type Section_Opening_Line = {
	content?: string | null
	text_color?: Text_Color
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
	 | Read for one question and no other: what the blocks at its two ends asked
	 | for in `spacing_around`, which decides whether this section pads at each
	 | edge. That cannot be asked of `children` — a rendered region is
	 | nodes with no blocks behind them — and it cannot be asked from inside the
	 | block either, because padding is undone where it is laid down.
	 |
	 */
	content?: unknown
	opening_line?: Section_Opening_Line | null
	link?: Link_Attribute | null
	background_gradient?: string
	background_pattern?: string
	background_position?: string
	/**
	 |
	 | A line below this section, drawn outside it and separating it from the
	 | one after.
	 |
	 | It is a hairline and it carries no spacing — neither its own nor any
	 | share of its neighbours'. What sits around it is the two sections'
	 | ordinary padding, unchanged by its being there.
	 |
	 */
	horizontal_rule?: boolean
	/**
	 |
	 | Whether this section pads above itself, below itself, both or neither.
	 |
	 | The block sitting at either edge has the same say — see `pads_at_top` and
	 | `pads_at_bottom` in `section-frame.tsx` — and the space goes if either of
	 | them declines it.
	 |
	 */
	spacing_around?: Spacing_Around
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
		spacing_around,
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

	const edges = {
		content,
		has_words: Boolean( heading?.content || section_link ),
		spacing_around,
	}

	const pad_top = pads_at_top( edges )
	const pad_bottom = pads_at_bottom( edges )

	const padding = section_padding( { one_column, pad_bottom, pad_top } )

	// Sections own the outer spacing at the top and bottom of the main
	// column now: the two-column main column carries no vertical padding
	// of its own, so the first and last section absorb what the column
	// used to lay down. A section that declined its padding at an edge — the
	// ticker is the case — declines this too and keeps butting against the
	// edge of the page.
	//
	// **Of the type, not of the children.** A section that draws a rule is
	// followed by an `<hr>` in the same parent, which costs it `:last-child`
	// and with it the padding that closes the page — silently, because a
	// positional selector that stops matching is not an error. A main region
	// holds nothing but sections, so the last `<section>` is the last section
	// however many rules are drawn between them.
	const outer_edges = one_column ? "" : [
		pad_top ? "[&:first-of-type]:md:pt-16" : "",
		pad_bottom ? "[&:last-of-type]:pb-8 [&:last-of-type]:md:pb-16" : "",
	].filter( Boolean ).join( " " )

	return <>
		<section
			className={ `scroll-mt-4 ${outer_edges}` }
			id={ anchor }
			style={ background }
		>
			<div className={ padding }>
				<div className={ one_column ? SECTION_CONTAINER : "" }>
					{ heading?.content
						? <Heading
							__component="text.heading-v1"
							id={ heading.id }
							content={ heading.content }
							level={ heading.level }
							link={ section_link }
							text_color={ heading.text_color } />
						: section_link
							&& <Link_Block { ...section_link } /> }

					{ heading?.content && opening_line?.content
						&& <Plain_String
							content={ opening_line.content }
							text_color={ opening_line.text_color } /> }

					{
						/* **A level is opened only where a heading was
					     actually drawn.** A level exists because a heading
					     divides the document, and a section with no heading
					     divides nothing — opening one there pushes everything
					     inside down a rank with no heading at the rank above,
					     which is a skipped level and a real accessibility
					     defect rather than a tidiness one.

					     It went unnoticed until the Archive, because a
					     heading-less section had until then only ever held
					     blocks that draw no headings of their own. */
					}
					{ heading?.content
						? <Level>{ children }</Level>
						: children }
				</div>
			</div>
		</section>
		{ horizontal_rule
			&& <hr className="border-0 border-t-2 border-gray-light" /> }
	</>
}
