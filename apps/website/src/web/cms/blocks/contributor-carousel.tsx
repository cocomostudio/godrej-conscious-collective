
/**
 |
 | The collaborator carousel — the turning ring on the home page.
 |
 | Portraits sit on a wave. The one in the middle swells; its neighbours sit in
 | the troughs, dropped below it from the medium breakpoint upward; the ones
 | beyond rise again. Moving it advances by exactly one, the captions fade out
 | while it travels, and it never runs out.
 |
 | Lifted from the static site, whose version is the most intricate thing in it.
 | Three things about how it works are worth knowing before changing anything:
 |
 |   • **Every slide is tweened on every frame, including the ones out of
 |     view.** Skipping the invisible ones looks like an obvious saving and is
 |     a bug: a slide crossing the visibility boundary mid-scroll freezes at
 |     whatever pose it had, then snaps when it comes back. Ten portraits are
 |     well inside the budget for tweening the lot.
 |
 |   • **The gate is a timer, not Embla's `settle` event.** Embla's tween keeps
 |     emitting sub-pixel decay long after the motion looks finished, so
 |     `settle` arrives late and the carousel would sit locked after it had
 |     visibly stopped.
 |
 |   • **The tween is applied synchronously from `scroll`.** Embla emits that
 |     from inside its own animation frame; anything scheduled from there lands
 |     on the next one, and the frame between paints Embla's new slide position
 |     against this file's old figure position. At the loop's wrap point that is
 |     a visible jump.
 |
 | **Two changes from the static site.** The slides come from the CMS rather
 | than from a literal array, so the loop's repetition count is measured rather
 | than assumed — an editor asking for three portraits would otherwise leave
 | gaps. And the glow under a portrait follows the resolved event's contributor
 | colour instead of the one hex value the static site hardcodes, which is the
 | same rule every other colour on the page already follows.
 |
 */

import type { CSSProperties } from "react"
import type { EmblaCarouselType } from "embla-carousel"
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react"
import useEmblaCarousel from "embla-carousel-react"

import { use_repetitions_needed_for_looping } from "#infra/lib/ui/react/embla-carousel/use-repetitions-needed-for-looping.ts"
import { use_media_query_event } from "#infra/lib/ui/react/use-media-query-event.tsx"

import type { Contributor_Card } from "../envelope.ts"

import { Portrait } from "../cards.tsx"
import { MEDIUM_FROM } from "../media.ts"

import { use_full_bleed } from "./section-frame.tsx"

/* _____
 | The design's own measurements.
 |
 | A portrait at rest, and the same portrait in the middle. Everything else —
 | the scale, how far the troughs drop, how far each slide is pushed outward to
 | keep the visible gaps even — is derived from these two pairs, so a change to
 | the sizes cannot leave one of the three behind.
 |
 */
const TROUGH_BELOW_MEDIUM = 170
const CENTRE_BELOW_MEDIUM = 234
const TROUGH_FROM_MEDIUM = 224
const CENTRE_FROM_MEDIUM = 336

/** How far the troughs sit below the middle portrait's lower edge. */
const VERTICAL_GAP = 32

const SCALE_BELOW_MEDIUM = CENTRE_BELOW_MEDIUM / TROUGH_BELOW_MEDIUM
const SCALE_FROM_MEDIUM = CENTRE_FROM_MEDIUM / TROUGH_FROM_MEDIUM

const OVERFLOW_BELOW_MEDIUM = ( CENTRE_BELOW_MEDIUM - TROUGH_BELOW_MEDIUM ) / 2
const OVERFLOW_FROM_MEDIUM = ( CENTRE_FROM_MEDIUM - TROUGH_FROM_MEDIUM ) / 2

// The middle portrait is scaled about its own centre, so it reaches
// CENTRE/2 below the wrapper's midline — which is (CENTRE + TROUGH)/2 from the
// wrapper's top. The gap goes below that.
const DROP_FROM_MEDIUM = ( CENTRE_FROM_MEDIUM + TROUGH_FROM_MEDIUM ) / 2
	+ VERTICAL_GAP

/* _____
 | Timing.
 |
 | One number governs both the visible motion and the gate that locks the
 | carousel while it travels, so the two cannot disagree: it becomes pressable
 | again exactly when it stops moving.
 |
 */
const TRAVEL_MS = 500
const TRAVEL_MS_FROM_MEDIUM = 1000

/** Kept well under the travel, so a caption is gone before the slides settle. */
const FADE_MS = 250

// Embla's `duration` is a friction coefficient rather than milliseconds. This
// conversion — roughly one frame at 60Hz — keeps the visible motion in step
// with the gate timer above. If the portraits ever arrive noticeably before or
// after the captions come back, this is the number to nudge.
const FRAME_MS = 17

const embla_duration = ( milliseconds: number ) =>
	Math.max( 5, Math.round( milliseconds / FRAME_MS ) )

/** What counts as a swipe rather than a tap that wandered. */
const SWIPE_DISTANCE = 20
const SWIPE_VELOCITY = 0.2

const ease_in_out_cubic = ( t: number ) =>
	t < 0.5 ? 4 * t * t * t : 1 - Math.pow( -2 * t + 2, 3 ) / 2

type Wave = {
	centre_scale: number
	drop: number
	overflow: number
}

const WAVE_BELOW_MEDIUM: Wave = {
	centre_scale: SCALE_BELOW_MEDIUM,
	drop: 0,
	overflow: OVERFLOW_BELOW_MEDIUM,
}

const WAVE_FROM_MEDIUM: Wave = {
	centre_scale: SCALE_FROM_MEDIUM,
	drop: DROP_FROM_MEDIUM,
	overflow: OVERFLOW_FROM_MEDIUM,
}

export function Contributor_Carousel (
	{ contributors }: { contributors: Contributor_Card[] },
) {
	const full_bleed = use_full_bleed()
	const travel = useRef( TRAVEL_MS )

	use_media_query_event( `( min-width: ${MEDIUM_FROM}px )`, () => {
		travel.current = TRAVEL_MS_FROM_MEDIUM

		return () => {
			travel.current = TRAVEL_MS
		}
	} )

	const [ embla_ref, embla_api ] = useEmblaCarousel( {
		align: "center",
		breakpoints: {
			[`( min-width: ${MEDIUM_FROM}px )`]: {
				duration: embla_duration( TRAVEL_MS_FROM_MEDIUM ),
			},
		},
		duration: embla_duration( TRAVEL_MS ),
		loop: true,
		skipSnaps: false,
		// Dragging is handled below, because a drag has to advance by exactly
		// one rather than coasting.
		watchDrag: false,
	} )

	const tween_nodes = useRef<
		{ figure: HTMLElement; image: HTMLElement; caption: HTMLElement }[]
	>( [] )

	const set_tween_nodes = useCallback( ( api: EmblaCarouselType ) => {
		tween_nodes.current = api.slideNodes().map( ( slide ) => ( {
			caption: slide.querySelector( ".js_caption" ) as HTMLElement,
			figure: slide.querySelector( ".js_figure" ) as HTMLElement,
			image: slide.querySelector( ".js_image" ) as HTMLElement,
		} ) )
	}, [] )

	// Held in a ref rather than in state: crossing a breakpoint changes where
	// the wave sits, and the next tween is what should pick that up — not a
	// re-render of ten portraits.
	const wave = useRef<Wave>(
		typeof window !== "undefined"
			&& window.matchMedia( `( min-width: ${MEDIUM_FROM}px )` ).matches
			? WAVE_FROM_MEDIUM
			: WAVE_BELOW_MEDIUM,
	)

	const apply_tween = useCallback( ( api: EmblaCarouselType ) => {
		const engine = api.internalEngine()
		const progress = api.scrollProgress()
		const snaps = api.scrollSnapList()
		const step = snaps.length > 1 ? Math.abs( snaps[1] - snaps[0] ) : 1

		const { centre_scale, drop, overflow } = wave.current

		snaps.forEach( ( snap, snap_index ) => {
			let difference = snap - progress

			for ( const slide_index of engine.slideRegistry[snap_index] ) {
				if ( engine.options.loop ) {
					// A slide that has wrapped is measured from the copy the
					// visitor is looking at rather than from its own index.
					for (
						const loop_item of engine.slideLooper.loopPoints
					) {
						const target = loop_item.target()

						if (
							slide_index !== loop_item.index
							|| target === 0
						) {
							continue
						}

						difference = Math.sign( target ) === -1
							? snap - ( 1 + progress )
							: snap + ( 1 - progress )
					}
				}

				// In slide units: 0 is the middle, ±1 the troughs beside it,
				// ±2 the next peaks.
				const distance = difference / step

				// The scale moves only across the middle-to-trough band, and
				// is flat at rest beyond it.
				const towards = Math.min( Math.abs( distance ), 1 )
				const swell = 1 - ease_in_out_cubic( towards )
				const scale = 1 + ( centre_scale - 1 ) * swell

				// A cosine gives the alternating peaks and troughs.
				const down = drop * ( 1 - Math.cos( distance * Math.PI ) )
					/ 2

				// Each slide is pushed outward by however much it is currently
				// overflowing its box, so the visible gap between neighbours
				// stays constant. It works because the easing of a distance
				// and of its complement always sum to one.
				const sideways = overflow
					* ease_in_out_cubic( towards )
					* Math.sign( distance )

				// The caption sits a constant distance below the picture's
				// *visible* edge, so it has to move down as the picture grows.
				const caption_down = overflow * swell

				const node = tween_nodes.current[slide_index]

				if ( !node ) {
					continue
				}

				node.image.style.scale = `${scale}`
				node.figure.style.translate = `${sideways}px ${down}px`
				node.caption.style.translate = `0 ${caption_down}px`
			}
		} )
	}, [] )

	// Several requests within one frame collapse into one apply, and the api is
	// read when it runs rather than when it was asked for.
	const frame = useRef<number | null>( null )
	const latest_api = useRef<EmblaCarouselType | null>( null )

	const schedule_tween = useCallback( ( api: EmblaCarouselType ) => {
		latest_api.current = api

		if ( frame.current !== null ) {
			return
		}

		frame.current = requestAnimationFrame( () => {
			frame.current = null

			if ( latest_api.current ) {
				apply_tween( latest_api.current )
			}
		} )
	}, [ apply_tween ] )

	use_media_query_event( `( max-width: ${MEDIUM_FROM - 1}px )`, () => {
		wave.current = WAVE_BELOW_MEDIUM

		if ( embla_api ) {
			schedule_tween( embla_api )
		}
	} )

	use_media_query_event( `( min-width: ${MEDIUM_FROM}px )`, () => {
		wave.current = WAVE_FROM_MEDIUM

		if ( embla_api ) {
			schedule_tween( embla_api )
		}
	} )

	const viewport = useRef<HTMLDivElement | null>( null )
	const travelling = useRef( false )
	const gate_timer = useRef<ReturnType<typeof setTimeout> | null>( null )
	const fade_timer = useRef<ReturnType<typeof setTimeout> | null>( null )

	const clear_timers = useCallback( () => {
		for ( const timer of [ gate_timer, fade_timer ] ) {
			if ( timer.current !== null ) {
				clearTimeout( timer.current )
				timer.current = null
			}
		}
	}, [] )

	// The one place that marks the carousel as travelling. A swipe is the
	// only way a visitor moves it, and it goes through here.
	const begin = useCallback( () => {
		travelling.current = true
		viewport.current?.style.setProperty( "--caption-opacity", "0" )

		clear_timers()

		gate_timer.current = setTimeout( () => {
			gate_timer.current = null
			travelling.current = false
		}, travel.current )

		fade_timer.current = setTimeout( () => {
			viewport.current?.style.setProperty( "--caption-opacity", "1" )
		}, travel.current + FADE_MS )
	}, [ clear_timers ] )

	useLayoutEffect( () => {
		if ( !embla_api ) {
			return
		}

		set_tween_nodes( embla_api )
		apply_tween( embla_api )

		// Again on the next frame: some browsers finalise Embla's measurements
		// a tick after init, and every portrait should be on its peak or in its
		// trough from the first paint.
		requestAnimationFrame( () => apply_tween( embla_api ) )

		// Synchronously — see the note at the top of this file.
		const on_scroll = () => apply_tween( embla_api )

		// One last apply once it has fully stopped, in case the terminal
		// sub-pixel adjustment landed after the last scroll frame. The gate was
		// released by its own timer long before this.
		const on_settle = () => schedule_tween( embla_api )

		// A resize aborts whatever was in flight, so the gate is released here
		// rather than left locked by a timer that will never mean anything.
		const on_re_init = () => {
			set_tween_nodes( embla_api )
			apply_tween( embla_api )
			clear_timers()
			travelling.current = false
			viewport.current?.style.setProperty( "--caption-opacity", "1" )
		}

		embla_api
			.on( "reInit", on_re_init )
			.on( "scroll", on_scroll )
			.on( "settle", on_settle )

		return () => {
			embla_api
				.off( "reInit", on_re_init )
				.off( "scroll", on_scroll )
				.off( "settle", on_settle )

			if ( frame.current !== null ) {
				cancelAnimationFrame( frame.current )
				frame.current = null
			}

			clear_timers()
		}
	}, [
		apply_tween,
		clear_timers,
		embla_api,
		schedule_tween,
		set_tween_nodes,
	] )

	// A ref, so the long-lived pointer handlers read the current api without
	// re-attaching a DOM listener on every render.
	const api_for_pointers = useRef( embla_api )

	useEffect( () => {
		api_for_pointers.current = embla_api
	}, [ embla_api ] )

	const [ viewport_node, set_viewport_node ] = useState<
		HTMLDivElement | null
	>( null )

	const viewport_ref = useCallback( ( node: HTMLDivElement | null ) => {
		viewport.current = node
		set_viewport_node( node )
		embla_ref( node )

		if ( !node ) {
			return
		}

		let started_at = 0
		let started_when = 0

		const on_down = ( event: PointerEvent ) => {
			started_at = event.clientX
			started_when = event.timeStamp
		}

		const on_up = ( event: PointerEvent ) => {
			if ( travelling.current ) {
				return
			}

			const moved = event.clientX - started_at
			const took = event.timeStamp - started_when
			const speed = Math.abs( moved ) / Math.max( took, 1 )

			if (
				Math.abs( moved ) < SWIPE_DISTANCE && speed < SWIPE_VELOCITY
			) {
				return
			}

			begin()

			if ( moved < 0 ) {
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
	}, [ begin, embla_ref ] )

	const [ track_node, set_track_node ] = useState<HTMLDivElement | null>(
		null,
	)

	const repeat_count = use_repetitions_needed_for_looping(
		track_node,
		viewport_node,
		contributors.length,
	)

	// The four custom properties are the pre-hydration pose, and they are
	// written as literals because Tailwind generates a class from what it can
	// read in the source. **They must agree with the constants at the top of
	// this file** — 32/56 for the overflow, 312 for the drop, 234/170 and
	// 336/224 for the scale. The static site's copy of this disagreed with its
	// own script by 56 pixels, which is what a first paint against a stale
	// number looks like.
	//
	// **The ring takes the section's full width**, so that it runs off both
	// edges rather than stopping at the twelve-column container and showing
	// where the loop ends.
	return <div
		className={ `${full_bleed} -mt-4 overflow-hidden pt-[calc(var(--cc-overflow)+48px)] pb-[calc(var(--cc-overflow)+var(--cc-drop))] [--caption-opacity:1] [--cc-overflow:32px] md:[--cc-overflow:56px] [--cc-drop:0px] md:[--cc-drop:312px] [--cc-centre-scale:1.3764706] md:[--cc-centre-scale:1.5]` }
		ref={ viewport_ref }>
		<div
			className="flex items-start gap-4 md:gap-8 [&>*:first-child]:ml-4 md:[&>*:first-child]:ml-8 [touch-action:pan-y]"
			ref={ set_track_node }>
			{ Array.from( { length: repeat_count } ).flatMap( (
				_unused,
				repetition,
			) => contributors.map( ( person, index ) =>
				<div
					aria-hidden={ repetition > 0 }
					className="shrink-0 w-42.5 md:w-56"
					key={ `${repetition}-${index}` }
					style={ at_rest( index, contributors.length ) }>
					<Portrait
						caption_className="js_caption opacity-[var(--caption-opacity)] transition-opacity [translate:0_var(--from-caption)] will-change-transform"
						contributor={ person }
						figure_className="js_figure relative select-none will-change-transform [translate:var(--from-x)_var(--from-y)]"
						image_className="js_image origin-center will-change-transform [scale:var(--from-scale)] shadow-[0_2px_32px_0_rgba(var(--ctx-contributor-color),0.65)]" />
				</div>
			) ) }
		</div>
	</div>
}

/**
 |
 | Where a slide sits before any script has run.
 |
 | Each of these resolves to exactly what the tween would compute for a slide at
 | that distance from the middle, assuming Embla starts on the first one. The
 | browser then overrides them the moment it initialises, which is invisible —
 | and until it does, the wave is already drawn rather than being a flat row
 | that jumps into shape.
 |
 */
function at_rest ( index: number, count: number ): CSSProperties {
	// For a ten-slide loop, 0..5 sit to the right and 6..9 wrap around to the
	// left as −4 .. −1.
	const distance = index <= count / 2 ? index : index - count
	const side = Math.sign( distance )
	const middle = distance === 0
	const trough = Math.abs( distance ) % 2 === 1

	return {
		"--from-caption": middle ? "var(--cc-overflow)" : "0px",
		"--from-scale": middle ? "var(--cc-centre-scale)" : "1",
		"--from-x": side === 0
			? "0px"
			: side > 0
			? "var(--cc-overflow)"
			: "calc( -1 * var(--cc-overflow) )",
		"--from-y": trough ? "var(--cc-drop)" : "0px",
	} as CSSProperties
}
