
/**
 |
 | Instagram feed — a leaf. A full-width strip of pictures that loops forever,
 | its slides scaling and tilting with the scroll position.
 |
 | **It does not call Instagram.** There is no embed, no API and no scrape — the
 | pictures are the ones an editor added. The name is art direction. The static
 | site's version renders six hardcoded placeholder URLs, which is exactly what
 | giving this component slides exists to prevent.
 |
 | It holds the same attributes as the vanilla carousel and renders nothing like
 | it, which is why the two are separate components rather than one with an enum
 | naming the pages they appear on.
 |
 | **Two defects from the static site are fixed here.** Its two first-child
 | margin classes were both unconditional, so the wider one won at every width
 | and the narrower one was dead; the wider one is now behind the medium
 | breakpoint, which is plainly what was meant. And its scale factor switched at
 | 1320 pixels — a breakpoint in no configuration — while the slide's own width
 | switched at the medium breakpoint of 1024, leaving a band roughly 300 pixels
 | wide where a 304-pixel slide was tweened with a ratio derived from a
 | 202-pixel one. Both now switch at the same place.
 |
 */

import type { EmblaCarouselType } from "embla-carousel"
import {
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react"
import useEmblaCarousel from "embla-carousel-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"

import { use_repetitions_needed_for_looping } from "#infra/lib/ui/react/embla-carousel/use-repetitions-needed-for-looping.ts"
import { H } from "#infra/lib/ui/react/headings.tsx"
import { Chevron_Right } from "#infra/lib/ui/react/icons/chevron-right.tsx"
import { use_media_query_event } from "#infra/lib/ui/react/use-media-query-event.tsx"

import type { Image_Link_Attribute } from "./image-link.tsx"

import { use_media_origin } from "../media-origin.tsx"
import {
	MEDIUM_FROM,
	responsive_picture_of,
} from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { Responsive_Picture } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"
import { use_full_bleed } from "./section-frame.tsx"

const HANDLE = "@godrejdesignlab"
const PROFILE_URL = "https://www.instagram.com/godrejdesignlab"

// A slide at rest, and the same slide at the centre of the strip. Both pairs
// are the design's own measurements; the ratio between them is what the tween
// interpolates towards.
const SCALE_BELOW_MEDIUM = 234 / 202
const SCALE_FROM_MEDIUM = 368 / 304

// The alternating tilt, in degrees. Slides sit like scattered photographs.
const TILT = 3.5

export function Instagram_Feed (
	{ slides = [] }: { slides?: Image_Link_Attribute[] },
) {
	const origin = use_media_origin()
	const full_bleed = use_full_bleed()

	const pictures = slides
		.map( ( slide ) => responsive_picture_of( slide?.image, origin ) )
		.filter( ( picture ) => picture !== null )

	const [ embla_ref, embla_api ] = useEmblaCarousel( {
		dragFree: true,
		loop: true,
	}, [
		WheelGesturesPlugin( { forceWheelAxis: "x" } ),
	] )

	const tween_nodes = useRef<HTMLElement[]>( [] )

	const set_tween_nodes = useCallback( ( api: EmblaCarouselType ) => {
		tween_nodes.current = api.slideNodes()
			.map( ( slide ) =>
				slide.querySelector( ".js_slide__inner" ) as HTMLElement
			)
			.filter( Boolean )
	}, [] )

	const scale_factor = useRef( SCALE_BELOW_MEDIUM )

	const apply_tweens = useCallback( ( api: EmblaCarouselType ) => {
		const engine = api.internalEngine()
		const snap_list = api.scrollSnapList()
		const step = snap_list.length > 1
			? snap_list[1] - snap_list[0]
			: 1
		const scroll_progress = api.scrollProgress()
		const slides_in_view = api.slidesInView()

		snap_list.forEach( ( snap, slide_index ) => {
			if ( !slides_in_view.includes( slide_index ) ) {
				return
			}

			let difference_to_target = snap - scroll_progress

			// A slide that has wrapped around is measured from the copy the
			// visitor is actually looking at rather than from its own index.
			engine.slideLooper.loopPoints.forEach( ( loop_item ) => {
				const target = loop_item.target()

				if ( loop_item.index !== slide_index || target === 0 ) {
					return
				}

				difference_to_target = Math.sign( target ) === -1
					? snap - ( 1 + scroll_progress )
					: snap + ( 1 - scroll_progress )
			} )

			// In slide-count units: 0 at the centre, ±1 at the neighbours.
			const distance = difference_to_target * snap_list.length
			const rotation = tilt_at( difference_to_target / step )

			const scale_fraction = Math.max( 0, 1 - Math.abs( distance ) )
			const scale = 1
				+ ( scale_factor.current - 1 ) * scale_fraction

			const node = tween_nodes.current[slide_index]

			if ( node ) {
				node.style.transform =
					`scale( ${scale} ) rotate( ${rotation}deg )`
			}
		} )
	}, [] )

	// Both queries switch at the medium breakpoint, which is where the slide's
	// own width switches. In the static site the scale switched at 1320 and the
	// width at 1024, so between the two the ratio was wrong.
	use_media_query_event( `( max-width: ${MEDIUM_FROM - 1}px )`, () => {
		scale_factor.current = SCALE_BELOW_MEDIUM

		if ( embla_api ) {
			apply_tweens( embla_api )
		}
	} )

	use_media_query_event( `( min-width: ${MEDIUM_FROM}px )`, () => {
		scale_factor.current = SCALE_FROM_MEDIUM

		if ( embla_api ) {
			apply_tweens( embla_api )
		}
	} )

	useLayoutEffect( () => {
		if ( !embla_api ) {
			return
		}

		const on_first_slides_in_view = () => {
			apply_tweens( embla_api )
			embla_api.off( "slidesInView", on_first_slides_in_view )
		}

		embla_api
			.on( "init", set_tween_nodes )
			.on( "init", apply_tweens )
			.on( "reInit", set_tween_nodes )
			.on( "reInit", apply_tweens )
			.on( "slidesInView", on_first_slides_in_view )
			.on( "scroll", apply_tweens )

		return () => {
			embla_api
				.off( "init", set_tween_nodes )
				.off( "init", apply_tweens )
				.off( "reInit", set_tween_nodes )
				.off( "reInit", apply_tweens )
				.off( "slidesInView", on_first_slides_in_view )
				.off( "scroll", apply_tweens )
		}
	}, [ apply_tweens, embla_api, set_tween_nodes ] )

	const [ viewport_node, set_viewport_node ] = useState<
		HTMLDivElement | null
	>( null )
	const [ track_node, set_track_node ] = useState<HTMLDivElement | null>(
		null,
	)

	const viewport_and_embla_ref = useCallback(
		( node: HTMLDivElement | null ) => {
			embla_ref( node )
			set_viewport_node( node )
		},
		[ embla_ref ],
	)

	const repeat_count = use_repetitions_needed_for_looping(
		track_node,
		viewport_node,
		pictures.length,
	)

	if ( pictures.length === 0 ) {
		return null
	}

	// The strip loops and runs off both edges, so the block takes the
	// section's full width — and puts its own heading back inside the
	// container, which is the one part of it that lines up with the grid.
	return <div className={ `${BLOCK_SPACING} ${full_bleed}` }>
		<div className="mx-auto cc md:px-1c text-black">
			<div className="flex flex-wrap md:flex-nowrap gap-4 md:gap-0 justify-between items-center">
				<H className="text-h1 font-semibold text-white">
					Follow our Instagram
				</H>

				<Nav_Link
					className="flex items-center gap-1 text-h4 underline text-white whitespace-nowrap"
					url={ PROFILE_URL }
					target="_blank">
					{ HANDLE }
					<Chevron_Right />
				</Nav_Link>
			</div>
		</div>

		<div
			className="mt-8 py-6 md:py-11 overflow-hidden"
			ref={ viewport_and_embla_ref }>
			<div
				className="flex gap-12 md:gap-15 [&>*:first-child]:ml-12 md:[&>*:first-child]:ml-15 [touch-action:pan-y_pinch-zoom]"
				ref={ set_track_node }>
				{ Array.from( { length: repeat_count } ).flatMap( (
					_unused,
					repetition,
				) => pictures.map( ( picture, index ) =>
					<div
						className="shrink-0"
						aria-hidden={ repetition > 0 }
						key={ `${repetition}-${index}` }>
						<figure className="relative w-full select-none origin-center js_slide__inner">
							<div className="relative w-50.5 aspect-3/4 md:w-76 rounded-lg overflow-hidden">
								<Responsive_Picture
									className="size-full object-cover origin-center"
									pictures={ picture } />
							</div>
						</figure>
					</div>
				) ) }
			</div>
		</div>
	</div>
}

/**
 |
 | The tilt at a continuous distance from the centre, in slide-units.
 |
 | Whole numbers alternate between the two extremes and zero sits flat;
 | everything between is interpolated, so a slide rotates smoothly as it passes.
 |
 */
function tilt_at ( offset: number ) {
	const sign = Math.sign( offset )
	const absolute = Math.abs( offset )
	const lower = Math.floor( absolute )
	const fraction = absolute - lower

	const at_lower = tilt_at_whole( lower, sign )
	const at_upper = tilt_at_whole( lower + 1, sign )

	return at_lower + ( at_upper - at_lower ) * fraction
}

function tilt_at_whole ( whole: number, sign: number ) {
	if ( whole === 0 ) {
		return 0
	}

	return sign * TILT * ( whole % 2 === 1 ? -1 : 1 )
}
