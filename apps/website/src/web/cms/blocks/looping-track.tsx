
/**
 |
 | A horizontal track that loops: drag it, throw it, or scroll a wheel across
 | it, and it never runs out.
 |
 | A list of five or more session cards is drawn as this. See
 | `arranged-cards.tsx`.
 |
 | **A carousel filled from a CMS has a problem the static site did not.** There,
 | the slide count was a literal in the source and always exceeded the viewport.
 | Here an editor can ask for three, and Embla's loop needs enough content on
 | either side to wrap onto — so the slides are repeated as many times as the
 | measured width says they must be, and every repetition after the first is
 | hidden from assistive technology. The measurement runs in a layout effect, so
 | the server renders two sets and the browser settles on the count it needs.
 |
 | **The alignment sentinel** lines the first card up with the text above it:
 | from the medium breakpoint upward the track aligns to how far the words sit
 | in from the edge of the column, rather than to the centre. That distance is
 | measured from the column the track is in, so it differs between a one-column
 | page and the main column of a two-column one. A hidden element carrying that
 | width is the only way to read a value that exists solely as a CSS custom
 | property.
 |
 */

import {
	type ReactNode,
	Children,
	useCallback,
	useRef,
	useState,
} from "react"
import useEmblaCarousel from "embla-carousel-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"

import { use_repetitions_needed_for_looping } from "#infra/lib/ui/react/embla-carousel/use-repetitions-needed-for-looping.ts"
import { breakpoints } from "#infra/lib/ui/app-shells/primary/breakpoints.ts"

import { use_column_inset_width } from "./section-frame.tsx"

type Looping_Track_Props = {
	/** The viewport's own spacing and bleed. */
	className?: string
	/** The width of one slide, at each breakpoint. */
	slide_className?: string
	children: ReactNode
}

export function Looping_Track (
	{ children, className = "", slide_className = "" }: Looping_Track_Props,
) {
	const slides = Children.toArray( children )

	const sentinel = useRef<HTMLDivElement>( null )
	const inset_width = use_column_inset_width()

	const [ embla_ref ] = useEmblaCarousel( {
		align: "center",
		breakpoints: {
			[`( min-width: ${breakpoints.md} )`]: {
				align: () => column_inset( sentinel.current ),
			},
		},
		containScroll: false,
		dragFree: true,
		loop: true,
	}, [
		WheelGesturesPlugin( { forceWheelAxis: "x" } ),
	] )

	const [ viewport_node, set_viewport_node ] = useState<
		HTMLDivElement | null
	>( null )
	const [ track_node, set_track_node ] = useState<HTMLDivElement | null>(
		null,
	)

	const viewport_and_embla_ref = useCallback(
		( node: HTMLDivElement | null ) => {
			set_viewport_node( node )
			embla_ref( node )
		},
		[ embla_ref ],
	)

	const repeat_count = use_repetitions_needed_for_looping(
		track_node,
		viewport_node,
		slides.length,
	)

	if ( slides.length === 0 ) {
		return null
	}

	return <>
		<div
			className={ `js_sentinel hidden ${inset_width}` }
			ref={ sentinel } />

		<div
			className={ `overflow-hidden ${className}` }
			ref={ viewport_and_embla_ref }>
			<div
				className="flex gap-4 md:gap-1g [&>*:first-child]:ml-4 md:[&>*:first-child]:ml-1g [touch-action:pan-y_pinch-zoom]"
				ref={ set_track_node }>
				{ Array.from( { length: repeat_count } ).flatMap( (
					_unused,
					repetition,
				) => slides.map( ( slide, index ) =>
					<div
						aria-hidden={ repetition > 0 }
						className={ `shrink-0 ${slide_className}` }
						key={ `${repetition}-${index}` }>
						{ slide }
					</div>
				) ) }
			</div>
		</div>
	</>
}

/**
 |
 | How far the words sit in from the column's edge, in pixels.
 |
 | Zero when the sentinel is not there or is not carrying a length — an
 | alignment of zero is the track's left edge, which is what the sentinel was
 | approximating in the first place.
 |
 */
function column_inset ( sentinel: HTMLElement | null ): number {
	if ( !sentinel ) {
		return 0
	}

	const width = Number.parseInt(
		window.getComputedStyle( sentinel ).width,
		10,
	)

	return Number.isNaN( width ) ? 0 : width
}
