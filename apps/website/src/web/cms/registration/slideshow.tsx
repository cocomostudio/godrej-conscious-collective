
/**
 |
 | A cross-fading slideshow that knows nothing about where it is used.
 |
 | LAYOUT — it fills the box its parent gives it and never asks for one of its
 | own. Every image is absolutely positioned and `object-cover`, so the
 | component contributes NO intrinsic height. Drop it into a flex row and the
 | other column decides how tall it is; give it a fixed box and it takes that.
 | Whatever it gets, the images cover it.
 |
 | THE FADE is deliberately not a symmetric cross-fade. In a symmetric one the
 | outgoing image travels 1 → 0 while the incoming travels 0 → 1, and at the
 | midpoint both sit near 0.5 — which means you are seeing THROUGH BOTH to the
 | container behind them. On two dissimilar photographs that reads as a distinct
 | brightness dip in the middle of every transition.
 |
 | So instead: the incoming slide is stacked ON TOP and fades in alone, and the
 | one it is replacing HOLDS AT FULL OPACITY underneath for the whole of it.
 | Nothing ever goes translucent over the background, so there is no dip. The
 | outgoing slide is only released once it is completely covered — and by then
 | releasing it is invisible.
 |
 | That is the whole reason for `previous_index`. It is not history-keeping; it
 | is the answer to "which slide has to stay solid right now". Exactly two
 | slides are opaque at any moment, and only during a transition.
 |
 |   z 2  index           opacity 1, transitioned  → the one fading in
 |   z 1  previous_index  opacity 1, transitioned  → the floor beneath it
 |   z 0  everything else opacity 0, transitioned
 |
 | The one imperfection: interrupt a fade mid-flight (click a dot within
 | `fade_ms` of an auto-advance) and the slide that was fading in becomes the
 | floor while still part-way there, so the composite dips by a few percent for
 | the remainder of that fade. Every alternative that closes this costs a
 | recency stack, and the artefact is a sub-half-second, sub-10% dip in a case
 | that needs a click inside a 450ms window. Left alone on purpose.
 |
 | THE CAPTIONS cannot do the same trick — two lines of different text stacked
 | at full opacity is unreadable, so they have to genuinely cross-fade. To keep
 | them from smearing over each other they are STAGGERED inside the image's
 | transition window: the outgoing caption leaves over the first half, the
 | incoming arrives over the second. Same total window as the image, so the
 | caption still changes "with" it, but the two are never both legible at once.
 |
 | The dots are outside all of this and never move.
 |
 | Lifted from the static site. The one change is where the slides come from —
 | an editor's upload on the page shell rather than an array in the source.
 |
 */

import type { KeyboardEvent } from "react"
import {
	useEffect,
	useRef,
	useState,
} from "react"

import { use_when_page_is_hidden } from "#infra/lib/ui/react/use-when-page-is-hidden.ts"

export type Slide = {
	src: string

	// Shown bottom-left over the scrim, and optional — a slide without one
	// leaves that corner empty. The dots do not shift either way, because the
	// caption and the dots are separate boxes in the same flex row.
	caption?: string

	// Defaults to "" — DECORATIVE. A slide that carries a caption has already
	// said what it is, to everyone, and repeating it into alt text just makes a
	// screen reader say it twice. Pass this only for a slide holding something
	// the caption does not cover.
	alt?: string
}

type Slideshow_Props = {
	slides: Slide[]

	// `aria-roledescription` needs an accessible name to attach to, or a screen
	// reader announces a "carousel" with nothing identifying it.
	label?: string

	initial_index?: number
	interval_ms?: number
	fade_ms?: number

	// For a caller that keeps the slideshow mounted but out of sight. Hover,
	// focus and tab-visibility are handled internally; this is the escape hatch
	// for the states only the caller can know about.
	paused?: boolean

	className?: string
}

const DEFAULT_LABEL = "Image slideshow"
const DEFAULT_INTERVAL_MS = 5000
const DEFAULT_FADE_MS = 450

// Bottom-left caption and bottom-right dots share one row so they can never
// overlap: the caption column is `grow min-w-0` and the dot group is
// `shrink-0`, so the dots always get their width first and the caption wraps
// into whatever is left, however many lines that takes.
//
// The row is what stops them COLLIDING; it does not set both their heights. It
// is anchored on the CAPTION's line — 24px up, 24px of side padding — and the
// dot group lifts itself the remaining 8px to sit at 32px. So the two do not
// share a baseline, and each one's offset is stated where it belongs.
//
// The caption column's own children are absolutely positioned against its
// bottom edge, so the column measures zero tall — which is what lets a caption
// that wraps grow UPWARD into the image instead of pushing the dots down.
const BOTTOM_ROW_CLASS =
	"absolute inset-x-0 bottom-6 z-20 flex items-end gap-4 px-6 pointer-events-none"

// The 8px that takes the dots from the row's 24px to their own 32px.
const DOT_GROUP_CLASS =
	"shrink-0 flex items-center gap-2 mb-2 pointer-events-auto"

// Sits above the images and below the row. Without it the caption and dots are
// at the mercy of whatever happens to be in the bottom of the photograph.
const SCRIM_CLASS = "absolute inset-x-0 bottom-0 z-10 h-1/2 pointer-events-none"
	+ " " + "bg-linear-to-t from-black/60 to-transparent"

// 6px dots, 8px apart, white at 0.35 until current.
//
// `before:` is a hit area, not a visual: 6px is far too small to aim at, so an
// empty pseudo-element inflates the target to 14 × 30 without touching layout.
// 14 wide is the ceiling — anything more and adjacent targets would overlap,
// which turns "I aimed at dot 3" into "I got dot 4".
//
// No focus RING, per the design: over an arbitrary photograph it has nothing to
// hold contrast against. The focused dot grows instead. NOTE that arrow-key
// navigation selects as it moves, so the active state is itself a reliable
// keyboard indicator — the growth is a second signal, not the only one.
const DOT_CLASS = [
	"relative size-1.5 rounded-full bg-white cursor-pointer",
	"before:content-[''] before:absolute before:-inset-y-3 before:-inset-x-1",
	"transition-[opacity,transform] duration-200 ease-out",
	"focus-visible:outline-none focus-visible:scale-150",
].join( " " )

export function Slideshow (
	{
		className = "",
		fade_ms = DEFAULT_FADE_MS,
		initial_index = 0,
		interval_ms = DEFAULT_INTERVAL_MS,
		label = DEFAULT_LABEL,
		paused = false,
		slides,
	}: Slideshow_Props,
) {
	const count = slides.length

	const [ index, set_index ] = useState( initial_index )
	const [ previous_index, set_previous_index ] = useState( -1 )

	const [ is_hovered, set_is_hovered ] = useState( false )
	const [ is_focused, set_is_focused ] = useState( false )
	const [ is_page_hidden, set_is_page_hidden ] = useState( false )

	// Only ever written by a MANUAL selection. Auto-advance deliberately never
	// touches it: a live region that fires every few seconds, forever, is not
	// an announcement, it is an interruption. Changing slides on purpose is
	// worth hearing about; the slideshow doing it on its own is not.
	const [ announcement, set_announcement ] = useState( "" )

	// The timer effect re-runs on `index`, so selecting a DIFFERENT slide
	// restarts the countdown for free. Selecting the CURRENT one leaves `index`
	// alone, and this is what makes that restart too.
	const [ restart_nonce, set_restart_nonce ] = useState( 0 )

	const dot_refs = useRef<Array<HTMLButtonElement | null>>( [] )

	use_when_page_is_hidden( () => {
		set_is_page_hidden( true )

		return () => set_is_page_hidden( false )
	} )

	const is_running = count > 1
		&& !paused
		&& !is_hovered
		&& !is_focused
		&& !is_page_hidden

	// A fresh `setTimeout` per tick rather than one `setInterval`, so that every
	// pause and every manual selection resets to a FULL interval rather than
	// dropping the visitor back into the middle of one someone else started.
	useEffect( () => {
		if ( !is_running ) {
			return
		}

		const id = setTimeout( () => {
			set_previous_index( index )
			set_index( ( index + 1 ) % count )
		}, interval_ms )

		return () => clearTimeout( id )
	}, [ is_running, index, count, interval_ms, restart_nonce ] )

	const select = ( next: number ) => {
		set_restart_nonce( ( nonce ) => nonce + 1 )

		const caption = slides[next].caption

		set_announcement(
			( caption ? `${caption}, ` : "" )
				+ `slide ${next + 1} of ${count}`,
		)

		if ( next === index ) {
			return
		}

		set_previous_index( index )
		set_index( next )
	}

	// Roving tabindex: the dot group is ONE stop in the tab order, not one per
	// dot. This slideshow sits beside a form, and five extra stops between the
	// visitor and the next field is a worse trade than asking them to use the
	// arrow keys — which is the conventional way through a group of related
	// controls anyway. Moving also selects, so there is no separate commit step.
	const on_dots_key_down = ( event: KeyboardEvent<HTMLDivElement> ) => {
		let next = index

		if ( event.key === "ArrowRight" || event.key === "ArrowDown" ) {
			next = ( index + 1 ) % count
		} else if ( event.key === "ArrowLeft" || event.key === "ArrowUp" ) {
			next = ( index - 1 + count ) % count
		} else if ( event.key === "Home" ) {
			next = 0
		} else if ( event.key === "End" ) {
			next = count - 1
		} else {
			return
		}

		event.preventDefault()
		select( next )

		// Focusing before the re-render is fine, and is why this needs no
		// effect: `tabIndex={ -1 }` blocks TABBING to an element, not focusing
		// it programmatically.
		dot_refs.current[next]?.focus()
	}

	if ( count === 0 ) {
		return null
	}

	const half_fade_ms = Math.round( fade_ms / 2 )

	// React's onFocus/onBlur bubble, so the pair below is focus-WITHIN. Scoped
	// to the slideshow on purpose: a visitor typing in the form alongside it
	// should not be freezing it by accident.
	return <div
		className={ `relative isolate overflow-hidden bg-gray-light ${className}` }
		role="group"
		aria-roledescription="carousel"
		aria-label={ label }
		onMouseEnter={ () => set_is_hovered( true ) }
		onMouseLeave={ () => set_is_hovered( false ) }
		onFocus={ () => set_is_focused( true ) }
		onBlur={ () => set_is_focused( false ) }>
		{ slides.map( ( slide, position ) =>
			<img
				key={ position }
				src={ slide.src }
				alt={ slide.alt ?? "" }
				decoding="async"
				className="absolute inset-0 size-full object-cover transition-opacity ease-out"
				style={ {
					// Inline rather than Tailwind because `fade_ms` is a prop,
					// and Tailwind's scanner reads class names as literal text
					// — it cannot see a runtime value.
					opacity:
						position === index || position === previous_index
							? 1
							: 0,
					transitionDuration: `${fade_ms}ms`,
					zIndex: position === index
						? 2
						: position === previous_index
						? 1
						: 0,
				} } />
		) }

		<div className={ SCRIM_CLASS } />

		<div className={ BOTTOM_ROW_CLASS }>
			<div className="relative grow min-w-0">
				{ slides.map( ( slide, position ) =>
					slide.caption
						? <p
							key={ position }
							aria-hidden={ position === index
								? undefined
								: "true" }
							className="absolute inset-x-0 bottom-0 text-h6 font-light text-white transition-opacity ease-out"
							style={ {
								opacity: position === index ? 1 : 0,
								// Out over the first half, in over the second.
								transitionDelay: position === index
									? `${half_fade_ms}ms`
									: "0ms",
								transitionDuration: `${half_fade_ms}ms`,
							} }>
							{ slide.caption }
						</p>
						: null
				) }
			</div>

			{ count > 1 && <div
				className={ DOT_GROUP_CLASS }
				onKeyDown={ on_dots_key_down }>
				{ slides.map( ( _slide, position ) =>
					<button
						key={ position }
						ref={ ( node ) => {
							dot_refs.current[position] = node
						} }
						type="button"
						tabIndex={ position === index ? 0 : -1 }
						aria-label={ `Show slide ${
							position + 1
						} of ${count}` }
						aria-current={ position === index
							? "true"
							: undefined }
						onClick={ () => select( position ) }
						className={ DOT_CLASS }
						style={ {
							opacity: position === index ? 1 : 0.35,
						} } />
				) }
			</div> }
		</div>

		{
			/* Always present and always polite, so the announcement lands the
		     moment its text changes. Toggling `aria-live` at the same instant
		     as the content is the unreliable way to do this — the region has to
		     already exist for the change to be picked up. */
		}
		<span className="sr-only" aria-live="polite">{ announcement }</span>
	</div>
}
