
/**
 |
 | Session listing with filtration — a leaf. The category listing pages.
 |
 | **The one listing that shows everything.** Every other listing in the
 | catalogue is capped at ten, and this one holds a category and nothing else:
 | the CMS sends the whole of it, and a visitor narrows it down here in the
 | browser rather than through a request. That is the trade the cap exists to
 | avoid making everywhere else, and it is made here because a filter over a
 | tenth of a category would be a filter that lies about what it searched.
 |
 | Three parts. A header, which says how many are showing and — below the
 | medium breakpoint — carries the trigger that opens the filters. The widget,
 | which goes to the sidebar or into a drawer and is drawn by neither of these.
 | And the grid of cards, which is the listing.
 |
 | **There is no category facet here**, because the page is already one
 | category and a facet with one answer is a question not worth asking. It
 | survives on the schedule, which reads across all four.
 |
 */

import type { CSSProperties } from "react"
import { useMemo } from "react"

import type {
	Category,
	Session_Card,
} from "../envelope.ts"
import type { Style_And_Transition } from "../cards.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"
import { Card } from "../cards.tsx"
import { facets_for } from "../filtration/facets.ts"
import { Filtration_Trigger } from "../filtration/filtration-trigger.tsx"
import { Filtration_Widget } from "../filtration/filtration-widget.tsx"
import { Nav_Link } from "../nav-link.tsx"
import {
	No_Matches,
	Showing,
} from "../filtration/showing.tsx"
import {
	Sessions,
	use_filtered_sessions,
	use_loaded_sessions,
} from "../filtration/sessions.tsx"
import {
	use_column_bleed,
	use_column_inset,
} from "./section-frame.tsx"
import { use_filtration_visibility } from "../filtration/use-filtration-visibility.ts"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

type Session_Listing_With_Filtration_Props = {
	/**
	 |
	 | What the editor chose, and **nothing here reads it.**
	 |
	 | It is named because it is on the node and a reader of this file should
	 | know what arrived. The CMS has already scoped the rows to it, so a block
	 | that read it again would be filtering a set that is already filtered —
	 | and every row's own `category` is what the cards colour themselves from.
	 |
	 */
	category?: Category
	sessions?: Session_Card[]
	style_and_transition?: Style_And_Transition
}

export function Session_Listing_With_Filtration (
	{ sessions = [], style_and_transition }:
		Session_Listing_With_Filtration_Props,
) {
	return <div className={ BLOCK_SPACING }>
		<Sessions sessions={ sessions }>
			<Listing style_and_transition={ style_and_transition } />
		</Sessions>
	</div>
}

/**
 |
 | The block's own three parts, inside the provider so that each can read it.
 |
 | **The widget is a sibling of the header rather than a child of it.** Where
 | there is a sidebar it renders nothing here and arrives there instead; where
 | there is not — a one-column page — it falls back to rendering in place, and
 | in place has to be somewhere a form can be laid out. Inside the header's flex
 | row it would be a form squeezed between a count and a button.
 |
 */
/** What both inner parts need of the node, and the only thing either takes. */
type Treatment_Props = { style_and_transition?: Style_And_Transition }

function Listing ( { style_and_transition }: Treatment_Props ) {
	const loaded = use_loaded_sessions()
	const filtration = use_filtration_visibility()

	const facets = useMemo(
		() => facets_for( "category", loaded ),
		[ loaded ],
	)

	const { className: gradient_classname, style: gradient_style } =
		compose_linear_vignette_gradient()

	/*
	 | **Two boxes, because the gradient goes further than the words do.**
	 |
	 | The outer one bleeds to the edges of the column and carries the paint.
	 | The inner one gives back exactly what that bleed took, so the header,
	 | the widget and the cards sit on the same line as every other block on
	 | the page. One box carrying both would have dragged the cards out with
	 | the colour.
	 */
	return <div
		className={ `${use_column_bleed()} ${gradient_classname}` }
		style={ gradient_style }>
		<div className={ use_column_inset() }>
			<Header facets={ facets } on_open={ filtration.show } />

			<Filtration_Widget
				facets={ facets }
				on_dismiss={ filtration.hide }
				visible={ filtration.visible } />

			<Cards style_and_transition={ style_and_transition } />
		</div>
	</div>
}

/**
 |
 | How many are showing, the way out to the schedule, and the trigger.
 |
 | **Sticky below the medium breakpoint**, so the count and the filters stay
 | with a visitor scrolling a long category. It scrolls away from there up,
 | where the filters are in the sidebar and stay visible on their own.
 |
 | It is drawn against the context colour at both widths, and lays that
 | colour down only below the breakpoint: there it is sticky and travels over
 | the white the gradient turns into, so it has to carry its own background.
 | Above, it sits still at the top of the gradient, which opens in the same
 | colour — a background there would be the colour painted twice.
 |
 | **The two buttons are a pair in a box of their own**, rather than each
 | pushed to the right on a margin of its own. The trigger is gone from the
 | medium breakpoint up and drops out entirely where a listing has no facets
 | to offer; the box holds the eight pixels between them through both.
 |
 */
function Header (
	{ facets, on_open }: {
		facets: ReturnType<typeof facets_for>
		on_open: () => void
	},
) {
	const showing = use_filtered_sessions()

	return <div className="max-md:sticky max-md:top-0 max-md:z-10 max-md:-mx-1ccm max-md:px-1ccm max-md:py-4 max-md:bg-context flex items-center gap-2">
		<Showing
			className="text-h6 md:text-h3 md:font-semibold font-light text-white"
			count={ showing.length } />

		<div className="ml-auto flex items-center gap-2">
			<Filtration_Trigger
				colour="white"
				facets={ facets }
				on_press={ on_open } />

			<Button
				color="white"
				emphasis="solid"
				render={ <Nav_Link url="/schedule" /> }
				text_color="context">
				Get the Schedule
			</Button>
		</div>
	</div>
}

/**
 |
 | The cards, two abreast from the medium breakpoint and stacked below it.
 |
 | A list, so that a visitor navigating by list hears how many there are — and
 | so that the count in the header is a count of something the page is actually
 | marked up as holding.
 |
 */
function Cards ( { style_and_transition }: Treatment_Props ) {
	const showing = use_filtered_sessions()

	if ( showing.length === 0 ) {
		return <No_Matches />
	}

	return <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
		{ showing.map( ( session ) =>
			<li key={ session.documentId }>
				<Card
					session={ session }
					style_and_transition={ style_and_transition } />
			</li>
		) }
	</ul>
}

function compose_linear_vignette_gradient () {
	const span_9c = "calc( ( 9 * var( --column-width ) ) + ( 8 * var( --gutter-x ) ) )"	// ≈ 1.5 cards tall
	const span_5c = "calc( ( 5 * var( --column-width ) ) + ( 4 * var( --gutter-x ) ) )"	// ≈ 1 card tall

	const linear_gradient = [
		"to bottom",
		"rgb( var( --ctx-context-color ) )",
		`rgb( var( --color-white ) ) ${ span_9c }`,
		"rgb( var( --color-white ) )",
		`rgb( var( --color-white ) ) calc( 100% - ${ span_5c } )`,
		"rgb( var( --ctx-context-color ) )",
	].join( ", " )

	return {
		// Custom properties are not part of React's `CSSProperties`, and
		// widening the type is the whole of what the cast buys — the same one
		// `context_colour_of` and `Root` make, for the same reason.
		style: { "--linear-gradient": linear_gradient } as CSSProperties,
		className: "bg-[linear-gradient(var(--linear-gradient))]",
	}
}
