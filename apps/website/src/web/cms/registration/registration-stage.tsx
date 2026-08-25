
/**
 |
 | The box inside the drawer/dialog that holds either the form or the
 | post-submission screen, and — below the medium breakpoint — morphs from one
 | to the other.
 |
 | THE MORPH, in one sentence: the box's height animates from the form's to the
 | confirmation's while the old contents fade out, the new contents fade in, and
 | the tick punches in over the top edge.
 |
 | WHY THE HEIGHT IS MEASURED IN JAVASCRIPT. `height: auto → auto` is not
 | interpolable, and the two ways around that are both shut here:
 |
 |   `interpolate-size` / `calc-size()`   Chrome 129+, and nothing else.
 |   `grid-template-rows: 0fr → 1fr`      Chrome 107+ and Safari 16+, so two of
 |                                        this project's three floors miss it —
 |                                        and it interpolates 0 → content, not
 |                                        content → content, which is the shape
 |                                        of the problem here.
 |
 | Two measured pixel values and a `height` transition work everywhere, so that
 | is what this does.
 |
 | THE ORDER OF EVENTS, which is the only fiddly part:
 |
 |   commit 1  `is_submitted` turns true and the stage renders the FORM anyway.
 |             That is the point: the stage's own height is still unambiguously
 |             the form's, and that is the height the morph starts from. An
 |             effect cannot get in front of a commit, so the decision to hold
 |             the form back for one more frame is taken during render — see
 |             `is_flipping` below.
 |   commit 2  both panes are mounted, stacked in one grid cell. Before the
 |             browser paints: mark the group `start` (transitions OFF,
 |             confirmation transparent, tick shrunk), read the confirmation's
 |             height, pin the outgoing form to the height it already had so it
 |             cannot squash, set the stage to the from-height, FLUSH, then mark
 |             the group `in` and set the to-height. Everything moves from there.
 |   the end   a timer unmounts the form pane, and a SECOND commit after that
 |             releases the attribute and the inline height — in that order,
 |             because both are load-bearing while the form is still up.
 |
 | `data-morph` is written straight to the DOM rather than rendered. It has to
 | change twice inside one synchronous block, either side of a forced reflow,
 | and a React re-render cannot be placed in the middle of that.
 |
 | THE BEATS. The two fades do NOT overlap: the form goes first, and only once
 | it is fully gone does the confirmation begin. That is what the delay on the
 | incoming pane buys — at these durations a crossfade would read as a smear of
 | two screens rather than one replacing the other.
 |
 |     0ms  the form starts fading out AND the box starts shrinking
 |   150ms  the form is gone. The confirmation and the tick start arriving
 |   300ms  everything has landed: the box, the fade-in, the punch
 |
 | Written once, in the two constants below, and handed to CSS as custom
 | properties on the group. Tailwind's scanner reads class names as literal text
 | and cannot follow a TypeScript constant — but it is perfectly happy to emit
 | `transition-duration: var( --morph-fade )`, and custom properties inherit, so
 | one declaration on the group reaches the stage, both panes, and the tick in
 | `registration-confirmation.tsx`. Change the numbers here and every site
 | moves.
 |
 */

import type {
	CSSProperties,
	ReactNode,
} from "react"
import {
	useLayoutEffect,
	useRef,
	useState,
} from "react"

const MORPH_FADE_MS = 450

const MORPH_HEIGHT_MS = 300

// The two fades run back to back and the height runs alongside both, so the
// morph is over when the longer of the two is. Nothing reads the DOM to find
// this out — see the teardown effect for why a timer beats `transitionend`.
const MORPH_TOTAL_MS = Math.max( MORPH_HEIGHT_MS, MORPH_FADE_MS * 2 )

// Stacked, not sequential: both panes occupy the same grid cell. `col-start-1
// row-start-1` rather than an arbitrary `grid-area`, because it is the same
// thing in utilities the scanner already knows.
const CELL_CLASS = "col-start-1 row-start-1"

// A NAMED group, and it has to be. The drawer popup is already a bare `group`,
// and the trigger facsimile inside it reads `group-data-[starting-style]:` off
// that — a second bare `group` in between would not steal those (Tailwind's
// unnamed variant matches any ancestor carrying the class) but naming this one
// keeps the two sets of state attributes from ever being confused for one
// another. Everything below addresses it as `/stage`.
const GROUP_CLASS = "group/stage relative flex flex-col min-h-0"

const STAGE_CLASS = [
	"grid min-h-0",
	"group-data-[morph=in]/stage:transition-[height]",
	"group-data-[morph=in]/stage:duration-[var(--morph-height)]",
	"group-data-[morph=in]/stage:ease-out",
].join( " " )

// `self-start` and the pinned height keep the outgoing form at the size it
// already had, so the shrinking stage CROPS it rather than squeezing it — a
// squeeze would reflow the fields and jump the scroll position for the whole
// length of the fade.
//
// `pointer-events-none` from the first frame of the morph: it is transparent
// for the back half of it, and an invisible form that still takes presses is
// worse than one that is merely in the way.
const FORM_PANE_CLASS = [
	CELL_CLASS,
	"flex flex-col min-h-0",
	"transition-opacity duration-[var(--morph-fade)] ease-out",
	"group-data-[morph]/stage:self-start group-data-[morph]/stage:overflow-hidden",
	"group-data-[morph]/stage:pointer-events-none",
	"group-data-[morph=in]/stage:opacity-0",
].join( " " )

// Resting state is opaque, so a container that mounts ALREADY submitted — every
// reopen after the first — simply shows it. Only `start`, which exists for one
// flushed frame at the top of the morph, makes it transparent.
//
// `transition-none` is part of `start` and is not decoration. This pane is
// inserted by the same commit that starts the morph, so it has no computed
// style yet, and whatever computes one first decides what it will transition
// FROM. Turning transitions off while the from-state is set makes that
// unguessable: the pane cannot animate INTO being hidden, whoever gets there
// first.
//
// The delay is the whole of the no-overlap rule: one fade's duration, so this
// one begins at the exact moment the form's ends.
const CONFIRMATION_PANE_CLASS = [
	CELL_CLASS,
	"self-start",
	"transition-opacity duration-[var(--morph-fade)] delay-[var(--morph-fade)] ease-out",
	"group-data-[morph=start]/stage:transition-none",
	"group-data-[morph=start]/stage:opacity-0",
].join( " " )

const FOCUSABLE_SELECTOR =
	"button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"

type Registration_Stage_Props = {
	is_submitted: boolean

	/** Below the medium breakpoint only. Without it the swap is a single frame. */
	morph?: boolean

	/** Applied to the animating box: whatever clipping and rounding it needs. */
	className?: string

	form: ReactNode
	confirmation: ReactNode
	badge: ReactNode
}

export function Registration_Stage (
	{
		badge,
		className = "",
		confirmation,
		form,
		is_submitted,
		morph = false,
	}: Registration_Stage_Props,
) {
	const group_ref = useRef<HTMLDivElement | null>( null )
	const stage_ref = useRef<HTMLDivElement | null>( null )
	const form_pane_ref = useRef<HTMLDivElement | null>( null )
	const confirmation_pane_ref = useRef<HTMLDivElement | null>( null )

	const height_from = useRef( 0 )

	// Initialised from the CURRENT value, so a stage that mounts already
	// submitted is not mistaken for one that just changed. That is what keeps a
	// reopen from replaying the morph.
	const seen_submitted = useRef( is_submitted )

	const [ is_morphing, set_is_morphing ] = useState( false )

	// Moves focus off the button that has just been unmounted-in-spirit and
	// onto the one control the new screen has. Only ever called on a SWAP: a
	// reopen mounts the confirmation as part of opening, and Base UI's own
	// `initialFocus` owns that case — stepping on it there left focus on
	// `<body>`, which is worse than anything it was trying to fix.
	const focus_confirmation = () => {
		confirmation_pane_ref.current
			?.querySelector<HTMLElement>( FOCUSABLE_SELECTOR )
			?.focus()
	}

	/*
	 | Read during render, and it has to be. The first commit after the flip
	 | must still show the FORM — its height is where the morph starts — and no
	 | effect can run early enough to hold a commit back.
	 |
	 | Reading a ref during render is safe here specifically because nothing
	 | writes it during render: `seen_submitted` is only ever assigned in the
	 | layout effect below, so a render that React throws away and repeats sees
	 | exactly the same answer both times.
	 |
	 | From the medium breakpoint up this is always false and the swap is the
	 | single commit it should be — which also keeps the two title elements from
	 | ever overlapping there. See the host.
	 */
	const is_flipping = morph && is_submitted && !seen_submitted.current

	useLayoutEffect( () => {
		if ( seen_submitted.current === is_submitted ) {
			return
		}

		seen_submitted.current = is_submitted

		if ( !is_submitted ) {
			return
		}

		if ( !morph ) {
			// Nothing to animate, so the confirmation is already on screen.
			focus_confirmation()
			return
		}

		height_from.current = stage_ref.current?.getBoundingClientRect()
			.height ?? 0
		set_is_morphing( true )
	}, [ is_submitted, morph ] )

	useLayoutEffect( () => {
		if ( !is_morphing ) {
			return
		}

		const group = group_ref.current
		const stage = stage_ref.current
		const form_pane = form_pane_ref.current
		const confirmation_pane = confirmation_pane_ref.current

		if ( !group || !stage || !form_pane || !confirmation_pane ) {
			return
		}

		/*
		 | ARM, and this is the FIRST statement for a reason. The confirmation
		 | and the tick were inserted by the commit that just ran, so they have
		 | no computed style yet — and whatever computes one first is what they
		 | will transition FROM. Anything that touches the DOM ahead of this
		 | line hands them a from-state of "already visible", and the fade-in
		 | then has nowhere to travel from. `start` carries `transition-none` as
		 | well as the from-state, so even a recalc forced from somewhere
		 | unexpected cannot leave them animating into hiding.
		 */
		group.dataset.morph = "start"

		// Flushes that armed state AND takes the measurement. Read AFTER the
		// attribute is set: `start` is what gives the pane `self-start`, and
		// without it the pane would report the stage's height rather than its
		// own. `getBoundingClientRect` forces the layout that makes both true.
		const height_to = confirmation_pane.getBoundingClientRect().height

		// Pinned, so the shrinking stage CROPS the outgoing form rather than
		// squeezing it — a squeeze would reflow the fields mid-fade.
		form_pane.style.height = `${height_from.current}px`
		stage.style.height = `${height_from.current}px`

		// The flush. Without it the browser only ever sees the to-height and
		// there is no start value to transition from.
		void stage.offsetHeight

		// RUN. Transitions come back on with `in`, and every from-state
		// resolved above is what they leave.
		group.dataset.morph = "in"
		stage.style.height = `${height_to}px`

		// Only now, and never before the arming. `.focus()` can force a style
		// recalc of its own, which was quite enough to give the confirmation a
		// from-state of "visible" and lose the fade-in entirely.
		//
		// Still before paint, which is all that matters: the submit button the
		// visitor pressed is inside the pane that is now `aria-hidden`, and
		// focus must not be sitting in there when the frame lands.
		focus_confirmation()

		/*
		 | A TIMER rather than `transitionend`, deliberately. The durations are
		 | declared at the top of this file, so asking the DOM when they are
		 | over is asking a question we already know the answer to — and the
		 | DOM's answer has three ways of being wrong: the event bubbles from
		 | descendants and has to be filtered, it never arrives at all when the
		 | two heights happen to match, and it is replaced by
		 | `transitioncancel` if anything interrupts. Firing a frame early would
		 | in any case be invisible: by then the stage is already pinned to the
		 | to-height and both panes are already at their target opacities.
		 */
		const timer = setTimeout(
			() => set_is_morphing( false ),
			MORPH_TOTAL_MS,
		)

		return () => clearTimeout( timer )
	}, [ is_morphing ] )

	/*
	 | THE TEARDOWN, and it has to be an effect of its own rather than the tail
	 | of the one above.
	 |
	 | Two things are holding the box at the confirmation's size: the inline
	 | height, and `data-morph` (which is what pins the outgoing form and stops
	 | it contributing its full height). Release either while the form pane is
	 | still mounted and the stage's `auto` height goes back to being the TALLER
	 | of the two panes — the drawer springs back up to the form's height with
	 | the confirmation stranded at the top of it and empty space underneath.
	 |
	 | React runs every DOM mutation before any layout effect, so by the time
	 | this runs the form pane is gone and `height: auto` resolves to exactly
	 | the value the pin was holding. Nothing moves.
	 */
	useLayoutEffect( () => {
		if ( is_morphing ) {
			return
		}

		const group = group_ref.current
		const stage = stage_ref.current

		if ( !group || !stage ) {
			return
		}

		// Undefined on a plain mount, which is every render but the one that
		// matters.
		if ( group.dataset.morph === undefined ) {
			return
		}

		delete group.dataset.morph
		stage.style.height = ""
	}, [ is_morphing ] )

	// The form outlives `is_submitted` by one commit plus the length of the
	// morph; the confirmation is held back for that same first commit.
	const show_form = !is_submitted || is_flipping || is_morphing
	const show_confirmation = is_submitted && !is_flipping

	/*
	 | The one place the beats are declared. They inherit from here to the
	 | stage, to both panes, and out of this file entirely to the tick — which
	 | is a descendant of this element and needs no import to be kept in step.
	 |
	 | The cast is React's `CSSProperties` not indexing custom properties. They
	 | reach the DOM perfectly well; only the type disallows them.
	 */
	const durations = {
		"--morph-fade": `${MORPH_FADE_MS}ms`,
		"--morph-height": `${MORPH_HEIGHT_MS}ms`,
	} as CSSProperties

	return <div ref={ group_ref } className={ GROUP_CLASS } style={ durations }>
		<div ref={ stage_ref } className={ `${STAGE_CLASS} ${className}` }>
			{ show_form && <div
				ref={ form_pane_ref }
				className={ FORM_PANE_CLASS }
				/*
				 | Hidden from assistive technology the moment it stops being
				 | the screen, rather than when it finishes leaving. Its
				 | controls stay in the tab order for the length of the morph —
				 | the honest cost of keeping a dead form on screen at all.
				 */
				aria-hidden={ is_morphing ? true : undefined }>
				{ form }
			</div> }

			{ show_confirmation && <div
				ref={ confirmation_pane_ref }
				className={ CONFIRMATION_PANE_CLASS }>
				{ confirmation }
			</div> }
		</div>

		{
			/* Outside the stage, and therefore outside its clip: this is the
		     half of the tick that hangs over the container's top edge. */
		}
		{ show_confirmation && badge }
	</div>
}
