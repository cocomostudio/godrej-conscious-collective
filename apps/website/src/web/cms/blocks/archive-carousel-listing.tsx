
/**
 |
 | Archive carousel listing — a leaf. The turning ring of past editions on the
 | home page.
 |
 | One slide sits in the middle at full size and names itself; the two beside it
 | are pushed outward and dimmed; and the ring never runs out. Moving it is a
 | drag, a wheel, or the two arrows above it.
 |
 | Lifted from the static site's "The Archives" section, and the three things
 | worth knowing before changing it are all about that ring:
 |
 |   • **The slide in the middle is found by the shortest way round, not by
 |     index.** A looping track is a ring: Embla wraps the trailing slides to
 |     the head of the track to fill the space left of centre, so a slide with a
 |     high index can be sitting on the left and must lean left with its
 |     neighbours. `side_of_centre` is that arithmetic and is the whole of why
 |     the lean does not invert at the loop's seam.
 |
 |   • **The scale and the lean are CSS, not a tween.** The static site carries
 |     a per-frame scale tween beside this whose one assignment is commented
 |     out, so what actually draws it there is the `.in-focus` class and the
 |     transitions hung off it. That is what is lifted; the dead tween is not.
 |
 |   • **A ring filled from a CMS has a problem the static site did not.**
 |     There the slide count was a literal and always exceeded the viewport.
 |     Here an editor can ask for two, and Embla's loop needs enough content on
 |     either side to wrap onto — so the slides are repeated as many times as
 |     the measured width says they must be, and every repetition after the
 |     first is hidden from assistive technology. The collaborator ring and the
 |     category tracks both do this; the note on `use_repetitions_needed_
 |     for_looping` is the one place it is explained at length.
 |
 | **The heading, the line under it and the "View All" link are the section's**,
 | not this block's. This holds slides and nothing else, which is what makes it
 | the same kind of component as the carousel and the Instagram feed rather than
 | a section that happens to turn.
 |
 */

import type { CSSProperties } from "react"
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react"
import useEmblaCarousel from "embla-carousel-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"

import { Icon_Button } from "#infra/lib/ui/react/buttons/icon-button.tsx"
import { use_repetitions_needed_for_looping } from "#infra/lib/ui/react/embla-carousel/use-repetitions-needed-for-looping.ts"
import { Chevron_Left } from "#infra/lib/ui/react/icons/chevron-left.tsx"
import { Chevron_Right } from "#infra/lib/ui/react/icons/chevron-right.tsx"

import type { Image_Link_Attribute } from "./image-link.tsx"

import { use_media_origin } from "../media-origin.tsx"
import { responsive_picture_of } from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { Responsive_Picture } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"
import { use_full_bleed } from "./section-frame.tsx"

/* _____
 | The design's own measurements.
 |
 | A slide at rest and the same slide in the middle, at each of the two widths
 | the design changes at. The scale is derived from the pair rather than written
 | out, so a change to one of the sizes cannot leave the other behind — which is
 | exactly the drift the static site's copy of this had.
 |
 */
const REST_BELOW_MEDIUM = 294
const CENTRE_BELOW_MEDIUM = 326
const REST_FROM_MEDIUM = 528
const CENTRE_FROM_MEDIUM = 576

/** What counts as a swipe rather than a tap that wandered. */
const SWIPE_DISTANCE = 20
const SWIPE_VELOCITY = 0.2

/**
 |
 | Which side of the middle a slide is on, the shortest way round the ring.
 |
 | Zero is the middle itself. A looping track has no first and last, so the
 | answer cannot come from comparing indices: the distance is measured both ways
 | and the shorter one wins.
 |
 */
function side_of_centre (
	index: number,
	centre: number,
	total: number,
): -1 | 0 | 1 {
	const half = total / 2
	const shortest = ( ( index - centre + half + total ) % total ) - half

	if ( shortest === 0 ) {
		return 0
	}

	return shortest < 0 ? -1 : 1
}

export function Archive_Carousel_Listing (
	{ slides = [] }: { slides?: Image_Link_Attribute[] },
) {
	const origin = use_media_origin()
	const full_bleed = use_full_bleed()

	const [ embla_ref, embla_api ] = useEmblaCarousel( {
		align: "center",
		duration: 30,
		loop: true,
		skipSnaps: true,
	}, [
		WheelGesturesPlugin( { forceWheelAxis: "x" } ),
	] )

	const [ centre, set_centre ] = useState( 0 )

	useEffect( () => {
		if ( !embla_api ) {
			return
		}

		const update = () => set_centre( embla_api.selectedScrollSnap() )

		update()
		embla_api.on( "reInit", update ).on( "select", update )

		return () => {
			embla_api.off( "reInit", update ).off( "select", update )
		}
	}, [ embla_api ] )

	// A ref, so the long-lived pointer handlers read the current api without
	// re-attaching a DOM listener on every render.
	const api_for_pointers = useRef( embla_api )

	useEffect( () => {
		api_for_pointers.current = embla_api
	}, [ embla_api ] )

	const [ viewport_node, set_viewport_node ] = useState<
		HTMLDivElement | null
	>( null )

	/**
	 |
	 | **A drag advances by exactly one, and a short one still counts.**
	 |
	 | Embla's own drag would coast past several slides, and the design's ring
	 | moves one at a time. So the gesture is read here: anything past twenty
	 | pixels, or any flick quicker than that, scrolls one slide in the
	 | direction it went. A vertical-dominant gesture is left alone entirely, so
	 | the page still scrolls under a thumb dragged down the ring.
	 |
	 */
	const viewport_ref = useCallback( ( node: HTMLDivElement | null ) => {
		set_viewport_node( node )
		embla_ref( node )

		if ( !node ) {
			return
		}

		let started_x = 0
		let started_y = 0
		let started_when = 0

		const on_down = ( event: PointerEvent ) => {
			started_x = event.clientX
			started_y = event.clientY
			started_when = event.timeStamp
		}

		const on_up = ( event: PointerEvent ) => {
			const moved_x = event.clientX - started_x
			const moved_y = event.clientY - started_y

			if ( Math.abs( moved_x ) <= Math.abs( moved_y ) ) {
				return
			}

			const took = event.timeStamp - started_when
			const speed = Math.abs( moved_x ) / Math.max( took, 1 )

			if (
				Math.abs( moved_x ) < SWIPE_DISTANCE
				&& speed < SWIPE_VELOCITY
			) {
				return
			}

			if ( moved_x < 0 ) {
				api_for_pointers.current?.scrollNext()
			}
			else {
				api_for_pointers.current?.scrollPrev()
			}
		}

		node.addEventListener( "pointerdown", on_down )
		node.addEventListener( "pointerup", on_up )

		return () => {
			node.removeEventListener( "pointerdown", on_down )
			node.removeEventListener( "pointerup", on_up )
		}
	}, [ embla_ref ] )

	const [ track_node, set_track_node ] = useState<HTMLDivElement | null>(
		null,
	)

	const pictures = slides
		.map( ( slide ) => ( {
			label: slide?.label ?? null,
			pictures: responsive_picture_of( slide?.image, origin ),
			url: slide?.url ?? null,
		} ) )
		.filter( ( slide ) => slide.pictures !== null )

	const repeat_count = use_repetitions_needed_for_looping(
		track_node,
		viewport_node,
		pictures.length,
	)

	const total = repeat_count * pictures.length

	if ( pictures.length === 0 ) {
		return null
	}

	return <div className={ BLOCK_SPACING }>
		{
			/* **The ring alone takes the section's full width**, so that it
			   runs off both edges rather than stopping at the twelve-column
			   container and showing where the loop ends.

			   Both scale factors are computed from the design's measurements
			   at the top of this file rather than written out, so the numbers
			   have one home. They are inline styles because a Tailwind class
			   has to be readable in the source, and a computed one is not.

			   **The breakpoint switch is a class on the track**, one level
			   below where the two values are declared. It has to be: an
			   inline style beats a class on the same element at every width,
			   so a `md:` class beside these would never win. On the child it
			   is the element's own declaration and shadows what it
			   inherited. */
		}
		<div
			className={ `${full_bleed} relative mt-6 pt-6 md:mt-8 overflow-hidden text-white` }
			ref={ viewport_ref }
			style={ {
				"--cc-scale": CENTRE_BELOW_MEDIUM / REST_BELOW_MEDIUM,
				"--cc-scale-from-medium": CENTRE_FROM_MEDIUM
					/ REST_FROM_MEDIUM,
			} as CSSProperties }>
			{
				/* The gap between slides lives as padding *inside* each
			     slide rather than as flex `gap`, so that it is part of every
			     slide's measured box. Embla's content size is then an exact
			     multiple of one slide, which keeps the spacing at the loop's
			     seam identical to the spacing everywhere else. */
			}
			<div
				className="flex items-center *:px-2 md:*:px-6 [touch-action:pan-y] md:[--cc-scale:var(--cc-scale-from-medium)]"
				ref={ set_track_node }>
				{ Array.from( { length: repeat_count } ).flatMap( (
					_unused,
					repetition,
				) => pictures.map( ( slide, index ) => {
					const position = repetition * pictures.length + index

					return <Slide
						aria_hidden={ repetition > 0 }
						in_focus={ position === centre }
						key={ `${repetition}-${index}` }
						label={ slide.label }
						pictures={ slide.pictures! }
						side={ side_of_centre( position, centre, total ) }
						url={ slide.url } />
				} ) ) }
			</div>
		</div>

		{
			/* The static site's own pagination: two outlined squares above
			   the ring, lined up with the section's heading, and absent below
			   the medium breakpoint where the ring is dragged instead. */
		}
		{/*<div className="flex justify-end gap-4 max-md:hidden">*/}
		<div className="max-md:hidden cc mt-6 mx-auto px-1c">
			<div className="relative">
				<div className="flex justify-end gap-4 absolute -top-13 right-0">
					<Icon_Button
						aria-label="View the previous archived event"
						colour="white"
						emphasis="outline"
						onClick={ () => embla_api?.scrollPrev() }>
						<Chevron_Left />
					</Icon_Button>
		
					<Icon_Button
						aria-label="View the next archived event"
						colour="white"
						emphasis="outline"
						onClick={ () => embla_api?.scrollNext() }>
						<Chevron_Right />
					</Icon_Button>
				</div>
			</div>
		</div>

	</div>
}

/**
 |
 | One slide.
 |
 | Everything that moves is a transition on a class rather than a value
 | computed per frame: the picture grows when the slide is `.in-focus`, the two
 | beside it lean away from the middle, and the caption fades in once the
 | travelling has finished — which is what the delay on it is for.
 |
 | The `<div>` under the figure is the static site's, and it is what gives the
 | slide a press target slightly larger than the picture so that a fingertip
 | landing just outside still counts.
 |
 */
function Slide (
	{ aria_hidden, in_focus, label, pictures, side, url }: {
		aria_hidden: boolean
		in_focus: boolean
		label: string | null
		pictures: NonNullable<ReturnType<typeof responsive_picture_of>>
		side: -1 | 0 | 1
		url: string | null
	},
) {
	const lean = side === -1
		? "-translate-x-4 md:-translate-x-1g"
		: side === 1
		? "translate-x-4 md:translate-x-1g"
		: ""

	const moving =
		"transition-[transform,opacity] ease-in duration-300 delay-150"

	const figure = <figure
		className={ `relative w-full select-none ${moving} ${lean} ${
			in_focus ? "opacity-100" : "opacity-65"
		}` }>
		<div
			className={ `relative size-73.5 md:w-185 lg:w-264 md:h-auto md:aspect-2/1 rounded-lg overflow-hidden ${moving} [transform:translateZ(0)_scale(1)] ${
				in_focus
					? "[transform:translateZ(0)_scale(var(--cc-scale))]"
					: ""
			}` }>
			<Responsive_Picture
				className="size-73.5 md:w-264 md:h-auto md:aspect-2/1 object-cover origin-center"
				pictures={ pictures } />
		</div>

		{ label
			&& <figcaption
				className={ `mt-6 md:-mx-8 lg:-mx-12 md:mt-11 transition-opacity duration-150 ease-in text-center md:text-left ${
					in_focus ? "opacity-100 delay-450" : "opacity-0"
				}` }>
				<p className="text-h6">{ label }</p>
			</figcaption> }

		<div aria-hidden={ true } className="absolute -inset-1"></div>
	</figure>

	return <div aria-hidden={ aria_hidden || undefined } className="shrink-0">
		{ url
			? <Nav_Link
				aria-label={ label || undefined }
				className="block"
				tabIndex={ aria_hidden ? -1 : undefined }
				url={ url }>
				{ figure }
			</Nav_Link>
			: figure }
	</div>
}
