
/**
 |
 | Heading.
 |
 | The element is chosen by `react-accessible-headings` from how deeply this
 | heading is nested, not by the editor. The editor's `level` picks how large it
 | looks and nothing else — which is what the static site was doing by hand, in
 | a place where getting it wrong produced an inaccessible document rather than
 | an ugly one.
 |
 | **The link beside it answers for its own colour.** It is a link component in
 | its own right and carries the same `text_color` attribute every link does, so
 | a heading turned white over a dark ground does not drag the link with it
 | unless the editor says so too.
 |
 | **Above a carousel, the row also carries the carousel's previous and next
 | buttons**, to the right of the heading and after the link. They take the
 | link's colour, or the heading's where there is no link, so the right-hand
 | side of the row reads as one thing. See `carousel-controls.tsx`.
 |
 */

import type { ReactNode } from "react"

import { H } from "#infra/lib/ui/react/headings.tsx"

import type {
	Block,
	Link as Link_Attribute,
} from "../envelope.ts"

import type { Text_Color } from "./text-color.ts"

import { use_anchor } from "../anchors.tsx"
import {
	use_text_colour_class,
	use_text_colour_token,
} from "../dark-surface.tsx"
import { text_color_class } from "./text-color.ts"
import { Carousel_Controls } from "./carousel-controls.tsx"
import { Nav_Link } from "../nav-link.tsx"
import { Chevron_Right } from "#infra/lib/ui/react/icons/chevron-right.tsx"

/**
 |
 | **A heading's weight follows how large it looks, not its element**: the
 | three largest sizes are semibold and the three smallest are regular, at
 | every width. So the weight is written beside the size, and a heading's call
 | site names neither.
 |
 | Only headings read this table. Text that borrows a heading's size — a
 | card's title, a marquee item, a profile's name — keeps a weight of its own.
 |
 */
const SIZES: Record<string, string> = {
	h1: "text-h1 font-semibold",
	h2: "text-h2 font-semibold",
	h3: "text-h3 font-semibold",
	h4: "text-h4 font-normal",
	h5: "text-h5 font-normal",
	h6: "text-h6 font-normal",
}

/**
 |
 | How large a heading of a given level looks, and therefore how heavy.
 |
 | Exported because a heading typed inside a text block is meant to be
 | indistinguishable from one placed as a component, and two copies of this table
 | would be two answers to how large `h3` is. Rich text names the level as a
 | number and this component as a string, which is the only difference between
 | them and is reconciled here rather than at either call site.
 |
 */
export function heading_size_class ( level: string | number ) {
	const named = typeof level === "number" ? `h${level}` : level

	return SIZES[named] ?? SIZES.h2
}

type Heading_Props = Pick<Block, "__component" | "id"> & {
	content: string
	level?: string
	link?: Link_Attribute | null
	text_color?: Text_Color
	/**
	 |
	 | Whether a carousel sits immediately below, so that the row carries its
	 | buttons. Decided by whoever renders the heading and the carousel side by
	 | side, never by the editor.
	 |
	 */
	carousel_controls?: boolean
	/**
	 |
	 | A section's opening line, which sits beneath the heading. Set in the
	 | heading's own column when the row carries a carousel's buttons, so the
	 | buttons stand to the right of both.
	 |
	 */
	opening_line?: ReactNode
}

export function Heading (
	{
		__component,
		carousel_controls = false,
		content,
		id,
		level = "h2",
		link,
		opening_line,
		text_color,
	}: Heading_Props,
) {
	const anchor = use_anchor( { __component, id } )
	const colour = use_text_colour_token( text_color, "context" )
	const link_colour = use_text_colour_token( link?.text_color, "context" )

	const heading = <H
		className={ `${heading_size_class( level )} ${
			text_color_class( colour, "context" )
		}` }>
		{ content }
	</H>

	if ( !carousel_controls ) {
		return <>
			<div
				className="flex flex-wrap items-center md:items-baseline justify-between gap-4 scroll-mt-[calc(1rem+var(--site-header-offset,0px))]"
				id={ anchor }>
				{ heading }

				{ link?.url && <Heading_Link link={ link } /> }
			</div>

			{ opening_line }
		</>
	}

	// 32px from the link to the buttons, and the whole right-hand side
	// centred against the heading and its opening line together.
	return <div
		className="flex items-center justify-between gap-4 md:gap-8 scroll-mt-[calc(1rem+var(--site-header-offset,0px))]"
		id={ anchor }>
		<div className="min-w-0">
			{ heading }
			{ opening_line }
		</div>

		<div className="flex items-center gap-8 shrink-0">
			{ link?.url && <Heading_Link link={ link } /> }

			<Carousel_Controls colour={ link?.url ? link_colour : colour } />
		</div>
	</div>
}

// Section links sit here — beside the heading — and read as inline
// navigation with a chevron, not as a button. The static site uses the
// same shape: underlined text and a right chevron, no button chrome.
function Heading_Link ( { link }: { link: Link_Attribute } ) {
	return <Nav_Link
		className={ `flex gap-1 items-center text-h6 underline underline-offset-4 whitespace-nowrap ${
			use_text_colour_class( link.text_color, "context" )
		}` }
		url={ link.url }>
		{ link.label ?? link.url }
		<Chevron_Right className="size-4" />
	</Nav_Link>
}
