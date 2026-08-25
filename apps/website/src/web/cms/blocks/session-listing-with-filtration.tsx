
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

import { useMemo } from "react"

import type {
	Category,
	Session_Card,
} from "../envelope.ts"

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
}

export function Session_Listing_With_Filtration (
	{ sessions = [] }: Session_Listing_With_Filtration_Props,
) {
	return <div className={ BLOCK_SPACING }>
		<Sessions sessions={ sessions }>
			<Listing />
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
function Listing () {
	const loaded = use_loaded_sessions()
	const filtration = use_filtration_visibility()

	const facets = useMemo(
		() => facets_for( "category", loaded ),
		[ loaded ],
	)

	return <>
		<Header facets={ facets } on_open={ filtration.show } />

		<Filtration_Widget
			facets={ facets }
			on_dismiss={ filtration.hide }
			visible={ filtration.visible } />

		<Cards />
	</>
}

/**
 |
 | How many are showing, the way out to the schedule, and the trigger.
 |
 | **Sticky below the medium breakpoint**, so the count and the filters stay
 | with a visitor scrolling a long category. It scrolls away from there up,
 | where the filters are in the sidebar and stay visible on their own.
 |
 */
function Header (
	{ facets, on_open }: {
		facets: ReturnType<typeof facets_for>
		on_open: () => void
	},
) {
	const showing = use_filtered_sessions()

	return <div className="max-md:sticky max-md:top-0 max-md:z-10 max-md:-mx-1ccm max-md:px-1ccm max-md:py-4 max-md:bg-white flex items-center gap-2">
		<Showing
			className="text-h6 md:text-h3 md:font-semibold font-light text-context"
			count={ showing.length } />

		<Filtration_Trigger
			className="ml-auto"
			colour="theme"
			facets={ facets }
			on_press={ on_open } />

		<Button
			className="max-md:hidden ml-auto"
			color="theme"
			emphasis="solid"
			render={ <Nav_Link url="/schedule" /> }>
			Get the Schedule
		</Button>
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
function Cards () {
	const showing = use_filtered_sessions()

	if ( showing.length === 0 ) {
		return <No_Matches />
	}

	return <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
		{ showing.map( ( session ) =>
			<li key={ session.documentId }>
				<Card session={ session } />
			</li>
		) }
	</ul>
}
