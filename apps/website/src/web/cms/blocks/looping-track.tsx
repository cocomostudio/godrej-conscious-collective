
/**
 |
 | A horizontal track that loops: drag it, throw it, or scroll a wheel across
 | it, and it never runs out.
 |
 | Two of the four category renderings are this — showcases and conversations —
 | and they differ in their spacing rather than in their mechanism. One track
 | rather than two copies of the same Embla wiring: a fix to how a loop measures
 | itself must not repair one row and miss the other.
 |
 | **A carousel filled from a CMS has a problem the static site did not.** There,
 | the slide count was a literal in the source and always exceeded the viewport.
 | Here an editor can ask for three, and Embla's loop needs enough content on
 | either side to wrap onto — so the slides are repeated as many times as the
 | measured width says they must be, and every repetition after the first is
 | hidden from assistive technology. The measurement runs in a layout effect, so
 | the server renders two sets and the browser settles on the count it needs.
 |
 | **The alignment sentinel** is the static site's, unchanged: from the medium
 | breakpoint upward the track aligns to the content container's own margin
 | rather than to the centre, so the first card lines up with the text above it.
 | A hidden element carrying that width is the only way to read a value that
 | exists solely as a CSS custom property.
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

import { MEDIUM_FROM } from "../media.ts"

type Looping_Track_Props = {
	/** The viewport's own spacing, which is what the two rows differ in. */
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

	const [ embla_ref ] = useEmblaCarousel( {
		align: "center",
		breakpoints: {
			[`( min-width: ${MEDIUM_FROM}px )`]: {
				align: () => content_margin( sentinel.current ),
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
		<div className="js_sentinel hidden w-1ccm" ref={ sentinel } />

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
 | The width of the content container's margin, in pixels.
 |
 | Zero when the sentinel is not there or is not carrying a length — an
 | alignment of zero is the track's left edge, which is what the sentinel was
 | approximating in the first place.
 |
 */
function content_margin ( sentinel: HTMLElement | null ): number {
	if ( !sentinel ) {
		return 0
	}

	const width = Number.parseInt(
		window.getComputedStyle( sentinel ).width,
		10,
	)

	return Number.isNaN( width ) ? 0 : width
}
