
/**
 |
 | A carousel's previous and next buttons, set in the row of the heading above
 | it.
 |
 | **Who gets them is decided on the raw blocks, by whatever renders the
 | pair.** A section asks of its own region whether it opens with a carousel,
 | because its heading sits immediately above that region's first block. The
 | renderer of a region asks of a heading block whether the next block beside
 | it is a carousel. Either way the parent knows before anything is drawn, so
 | the buttons are in the server's HTML and the heading row does not shift when
 | the page becomes interactive. They start working after hydration.
 |
 | **The parent wraps the pair in a context**, and the two halves meet there:
 | the carousel registers how to page itself once it has mounted, and the
 | buttons in the heading row call it. The nearest context wins, so a pair
 | inside a section never pages the section's own carousel.
 |
 | A slot and a fill would not do: a slot renders nothing on the server, so the
 | row would shift after hydration, and a context does not pass through one.
 |
 | Below the medium breakpoint the buttons are not drawn. A visitor there
 | swipes.
 |
 */

import {
	type ReactNode,
	createContext,
	use,
	useEffect,
	useMemo,
	useState,
} from "react"

import { Icon_Button } from "#infra/lib/ui/react/buttons/icon-button.tsx"
import { Chevron_Left } from "#infra/lib/ui/react/icons/chevron-left.tsx"
import { Chevron_Right } from "#infra/lib/ui/react/icons/chevron-right.tsx"

import type { EmblaCarouselType } from "embla-carousel"

import type { Block } from "../envelope.ts"
import type { Text_Color_Token } from "./text-color.ts"

import { arrangement_of_count } from "./arranged-cards.tsx"

/**
 |
 | How a carousel moves by one card, in each direction.
 |
 | A pair of functions rather than the carousel's Embla instance, because one
 | carousel — the collaborators' ring — gates its own movement while a move is
 | in flight, and a button that reached past that gate would break it.
 |
 */
export type Carousel_Pager = {
	previous: () => void
	next: () => void
}

type Controls = {
	pager: Carousel_Pager | null
	set_pager: ( pager: Carousel_Pager | null ) => void
}

const Controls_Context = createContext<Controls | null>( null )

export function Carousel_Controls_Provider (
	{ children }: { children: ReactNode },
) {
	const [ pager, set_pager ] = useState<Carousel_Pager | null>( null )

	const value = useMemo( () => ( { pager, set_pager } ), [ pager ] )

	return <Controls_Context value={ value }>{ children }</Controls_Context>
}

/**
 |
 | Called by a carousel, with how it pages itself. Does nothing outside a
 | provider, which is every carousel nobody gave a heading row.
 |
 | The pager has to keep its identity between renders, or the buttons are
 | handed a new one on every render of the carousel.
 |
 */
export function use_carousel_pager ( pager: Carousel_Pager | null ) {
	const set_pager = use( Controls_Context )?.set_pager

	useEffect( () => {
		if ( !set_pager || !pager ) {
			return
		}

		set_pager( pager )

		return () => set_pager( null )
	}, [ pager, set_pager ] )
}

/**
 |
 | The same, for a carousel that pages by Embla's own snaps and gates nothing:
 | one card per press, to whichever card is next.
 |
 */
export function use_embla_pager ( embla_api: EmblaCarouselType | undefined ) {
	use_carousel_pager( useMemo( () =>
		embla_api
			? {
				next: () => embla_api.scrollNext(),
				previous: () => embla_api.scrollPrev(),
			}
			: null, [ embla_api ] ) )
}

/**
 |
 | The two buttons, in the colour of the words beside them.
 |
 | Both are always pressable: every carousel with them loops, so there is no
 | end to be stuck at. Before hydration, and outside a provider, they are drawn
 | and do nothing.
 |
 */
export function Carousel_Controls (
	{ className = "", colour }: {
		className?: string
		colour: Text_Color_Token
	},
) {
	const pager = use( Controls_Context )?.pager

	return <div className={ `max-md:hidden flex gap-4 shrink-0 ${className}` }>
		<Icon_Button
			aria-label="Previous"
			colour={ colour }
			emphasis="outline"
			onClick={ () => pager?.previous() }>
			<Chevron_Left />
		</Icon_Button>

		<Icon_Button
			aria-label="Next"
			colour={ colour }
			emphasis="outline"
			onClick={ () => pager?.next() }>
			<Chevron_Right />
		</Icon_Button>
	</div>
}

/**
 |
 | Whether a raw block draws as a carousel that takes these buttons.
 |
 | Three do: a listing of session cards arranged as a carousel, the
 | collaborator listing in its carousel layout, and the Instagram feed. The
 | archive carousel keeps its own buttons at its foot, and the marquee, the
 | sponsors list and the vanilla carousel take none.
 |
 */
export function is_paged_carousel ( block: unknown ): boolean {
	if ( typeof block !== "object" || block === null ) {
		return false
	}

	const { __component, ...attributes } = block as Block

	switch ( __component ) {
		case "list.session-listing-v1":
		case "list.session-list-v1":
			return arrangement_of_count( count( attributes.sessions ) )
				=== "Carousel"

		case "list.contributor-listing-v1":
			return attributes.layout === "carousel"
				&& count( attributes.contributors ) > 0

		case "media.instagram-feed-v1":
			return count( attributes.slides ) > 0

		default:
			return false
	}
}

function count ( rows: unknown ) {
	return Array.isArray( rows ) ? rows.length : 0
}
