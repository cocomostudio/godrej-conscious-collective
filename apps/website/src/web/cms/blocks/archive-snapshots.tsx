
/**
 |
 | The snapshots of one past edition: a dialog, white on black, holding whatever
 | an editor put in that entry's region.
 |
 | **Each block in the region is a slide of its own — but only on a large, tall
 | screen.** Anywhere else the same blocks are a plain vertical column that the
 | dialog scrolls natively. That is one arrangement toggling, not two
 | components, and the whole of this file is about keeping the toggle honest.
 |
 | # The gate
 |
 | `(min-width: 1440px) and (min-height: 836px)` — the large breakpoint and the
 | tall one, together, lifted from the static site. The height is what the
 | width alone cannot say: a slide is a column as tall as the viewport, and 836
 | is what the design's own measurements add up to — a 612px slide, 64px of gap,
 | 32px of controls and 64px of air at each end. Below that a slide would be
 | shorter than the thing inside it.
 |
 | Three things are gated on it, and each has to be gated separately:
 |
 |   • **Embla**, through `active: false` plus a breakpoint that turns it on.
 |     Inactive, it leaves the DOM untransformed, so the column below the gate
 |     is the browser's own scrolling and not a carousel pretending to be one.
 |     Embla re-initialises itself when the query flips.
 |
 |   • **The ARIA**, by hand, because ARIA has no media queries. Below the gate
 |     this is a column of sections, and calling it a carousel there would be a
 |     lie told to exactly the people who cannot see that it is not one.
 |
 |   • **The arrow keys**, which are inert below the gate for the same reason.
 |
 | # Two details that look like mistakes
 |
 | **`initialFocus` aims at the next arrow.** The default is the first tabbable
 | element, which in a set of snapshots is typically a link buried several
 | slides in. Focusing it makes the browser scroll the track's `overflow:
 | hidden` box sideways to reveal it, which silently desyncs Embla — it
 | positions by transform and never reads `scrollLeft`. The arrow sits outside
 | the track, so nothing is scrolled behind Embla's back, and it puts the
 | primary control under the very first keypress. Below the gate the arrows are
 | `display: none` and focusing a hidden element does nothing at all, which
 | would strand focus outside the dialog — hence the fallback to the popup.
 |
 | **The arrows are `aria-disabled`, not `disabled`.** A disabled button leaves
 | the tab order, so a visitor at the last slide would find the control they
 | were using vanish under their hands. Presses on it are then silent, which is
 | what the live region underneath is for.
 |
 */

import type {
	KeyboardEvent,
	ReactNode,
} from "react"
import {
	useEffect,
	useId,
	useRef,
	useState,
} from "react"
import { Dialog } from "@base-ui/react/dialog"
import useEmblaCarousel from "embla-carousel-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"

import { Icon_Button } from "#infra/lib/ui/react/buttons/icon-button.tsx"
import { Chevron_Left } from "#infra/lib/ui/react/icons/chevron-left.tsx"
import { Chevron_Right } from "#infra/lib/ui/react/icons/chevron-right.tsx"
import { X_Mark } from "#infra/lib/ui/react/icons/x-mark.tsx"
import { Level } from "#infra/lib/ui/react/headings.tsx"
import { use_media_query_event } from "#infra/lib/ui/react/use-media-query-event.tsx"

import type { Block } from "../envelope.ts"

import { Dark_Surface } from "../dark-surface.tsx"
import { LARGE_FROM } from "../media.ts"
import { render_block } from "../render-block.tsx"

/** The design's minimum height for a slide, worked out in the static site. */
const TALL_FROM = 836

const AS_SLIDES = `(min-width: ${LARGE_FROM}px) and (min-height: ${TALL_FROM}px)`

type Archive_Snapshots_Props = {
	/** The entry's region. Each block becomes a slide above the gate. */
	content: Block[]
	/** What the dialog is called: the edition's name and its year. */
	title: string
	open: boolean
	on_open_change: ( open: boolean ) => void
	/** The tunnelled node the dialog portals into. */
	container: HTMLElement
}

/**
 |
 | **This component stays mounted and `open` toggles — it is not mounted by the
 | press.** That distinction is load-bearing and it is the one place this
 | diverges from the static site, which hardcodes `open={ true }` and lets the
 | press decide whether the dialog is in the tree at all.
 |
 | Base UI hangs its whole focus story off watching `open` go from false to
 | true. A dialog that is *born* open never gives it that edge, and three things
 | quietly do not happen:
 |
 |   • **focus never enters the dialog.** It stays on the button behind the
 |     backdrop, so the first Tab walks the page the visitor cannot see.
 |   • **there is no focus trap**, for the same reason.
 |   • **Escape does nothing.** Nothing is listening for the request to close,
 |     because `open` is not a value anything can change.
 |
 | All three were observed in a browser before this was changed. The
 | registration overlay in this build already had the working shape and is what
 | this now follows: the tunnelled container stays mounted, `open` is state
 | above it, and `onOpenChange` is what turns Escape and a press outside into
 | the same close the button performs. Nothing renders while it is shut —
 | `Dialog.Portal` mounts nothing until then.
 |
 */

export function Archive_Snapshots (
	{ container, content, on_open_change, open, title }:
		Archive_Snapshots_Props,
) {
	return <Dialog.Root onOpenChange={ on_open_change } open={ open }>
		<Dialog.Portal container={ container }>
			<Dialog.Backdrop className="fixed inset-0 bg-black z-30" />

			<Dialog.Viewport className="fixed inset-0 overflow-auto overscroll-contain bg-black z-30">
				<Snapshots content={ content } title={ title } />
			</Dialog.Viewport>
		</Dialog.Portal>
	</Dialog.Root>
}

function Snapshots (
	{ content, title }: Pick<Archive_Snapshots_Props, "content" | "title">,
) {
	const slides_id = useId()

	const [ embla_ref, embla_api ] = useEmblaCarousel( {
		active: false,
		// `center` rather than `start` because the track keeps its gutter —
		// centring makes every snap rest at that same inset.
		align: "center",
		breakpoints: { [AS_SLIDES]: { active: true } },
		// `false` rather than the default `trimSnaps`, so the first and last
		// slides centre like every other one instead of pinning to the edges.
		containScroll: false,
		// Drag, wheel and trackpad scroll freely and land wherever they land.
		// The arrows and the arrow keys go through `scrollTo`, which still
		// snaps, so snapping survives exactly where it is wanted — and Embla
		// keeps tracking the nearest snap either way, so the counter and the
		// arrows stay honest.
		dragFree: true,
		// A viewport-full at a time rather than one slide.
		slidesToScroll: "auto",
	}, [
		// Deliberately **not** `forceWheelAxis: "x"`: a slide is
		// `overflow-auto`, so a vertical wheel has to keep scrolling inside
		// it. Only horizontal intent pages the track.
		WheelGesturesPlugin(),
	] )

	const [ as_slides, set_as_slides ] = useState( false )

	use_media_query_event( AS_SLIDES, () => {
		set_as_slides( true )

		return () => set_as_slides( false )
	} )

	const [ index, set_index ] = useState( 0 )
	const [ count, set_count ] = useState( 0 )
	const [ can_go_back, set_can_go_back ] = useState( false )
	const [ can_go_on, set_can_go_on ] = useState( false )

	useEffect( () => {
		if ( !embla_api ) {
			return
		}

		const update = () => {
			set_can_go_back( embla_api.canScrollPrev() )
			set_can_go_on( embla_api.canScrollNext() )
			set_count( embla_api.scrollSnapList().length )
			set_index( embla_api.selectedScrollSnap() )
		}

		update()
		embla_api.on( "reInit", update ).on( "select", update )

		return () => {
			embla_api.off( "reInit", update ).off( "select", update )
		}
	}, [ embla_api ] )

	const popup = useRef<HTMLDivElement>( null )
	const next_button = useRef<HTMLButtonElement>( null )

	const initial_focus = () => {
		const button = next_button.current

		// `offsetParent` is null for a `display: none` element, which is what
		// the arrows are below the gate.
		if ( button && button.offsetParent !== null ) {
			return button
		}

		return popup.current
	}

	// Left and Right anywhere in the dialog page the slides. Scoped to the
	// popup rather than to the window, so it dies with the dialog.
	const on_key_down = ( event: KeyboardEvent<HTMLDivElement> ) => {
		if ( !as_slides || !embla_api ) {
			return
		}

		if (
			event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
		) {
			return
		}

		if ( event.key === "ArrowLeft" ) {
			event.preventDefault()
			embla_api.scrollPrev()
		}
		else if ( event.key === "ArrowRight" ) {
			event.preventDefault()
			embla_api.scrollNext()
		}
	}

	return <Dialog.Popup
		aria-label={ title }
		className="text-white outline-none before:sticky before:block before:top-0 before:w-full before:h-16 before:bg-black lg:tall:before:hidden after:sticky after:block after:bottom-0 after:w-full after:h-16 after:bg-black lg:tall:after:hidden"
		initialFocus={ initial_focus }
		onKeyDown={ on_key_down }
		ref={ popup }>
		{
			/* Everything below draws on black. The blocks are the same ones
		     an ordinary page uses, and this is the one thing that tells them
		     where they are — see `dark-surface.tsx`. */
		}
		<Dark_Surface>
			<div
				aria-label={ as_slides ? "Snapshots" : undefined }
				aria-roledescription={ as_slides ? "carousel" : undefined }
				className="lg:tall:overflow-hidden"
				ref={ embla_ref }
				role={ as_slides ? "group" : undefined }>
				<div
					className="cc lg:tall:max-w-none mx-auto px-4 md:px-0 lg:tall:px-[calc(theme(spacing.1ccm)+theme(spacing.2c1g))] lg:tall:py-16 space-y-12 md:space-y-16 lg:tall:space-y-0 lg:tall:flex lg:tall:items-center lg:tall:gap-2c1g lg:tall:*:h-[calc(100dvh-theme(spacing.56))] lg:tall:*:shrink-0 lg:tall:*:flex lg:tall:*:flex-col lg:tall:*:overflow-auto lg:tall:*:*:my-auto"
					id={ slides_id }>
					{
						/* One heading level for the whole dialog, opened
					     once here. A snapshot is not a division of the page
					     behind it, and the blocks inside nest their own
					     headings from wherever they land. */
					}
					<Level>
						{ content.map( ( block, position ) =>
							<Slide
								key={ `${block?.__component}:${
									block?.id ?? position
								}` }>
								{ render_block( block ) }
							</Slide>
						) }
					</Level>
				</div>
			</div>

			{
				/* Presses on an `aria-disabled` arrow are silent no-ops, so
			     say out loud where we ended up. Empty below the gate — there
			     are no slides to be on. */
			}
			<p aria-atomic="true" aria-live="polite" className="sr-only">
				{ as_slides ? `Slide ${index + 1} of ${count}` : "" }
			</p>

			<div className="lg:tall:absolute lg:tall:bottom-16 lg:tall:w-full lg:tall:flex lg:tall:justify-center lg:tall:gap-4">
				<Icon_Button
					aria-controls={ slides_id }
					aria-disabled={ !can_go_back }
					aria-label="Go to the previous slide"
					className="max-lg:hidden max-tall:hidden rounded-full"
					colour="white"
					emphasis="outline"
					onClick={ () => embla_api?.scrollPrev() }>
					<Chevron_Left />
				</Icon_Button>

				{
					/* No `onClick` of its own: `Dialog.Close` already asks the
				     root to close, and the root routes that back out through
				     `onOpenChange` — the same path Escape and a press outside
				     take. A second handler here would be a second way to
				     close, and only one of the two would ever be fixed. */
				}
				<Dialog.Close
					aria-label="Close the snapshots"
					className="fixed top-4 right-4 lg:tall:static p-1 rounded-full bg-white cursor-pointer">
					<X_Mark className="text-black" />
				</Dialog.Close>

				<Icon_Button
					aria-controls={ slides_id }
					aria-disabled={ !can_go_on }
					aria-label="Go to the next slide"
					className="max-lg:hidden max-tall:hidden rounded-full"
					colour="white"
					emphasis="outline"
					onClick={ () => embla_api?.scrollNext() }
					ref={ next_button }>
					<Chevron_Right />
				</Icon_Button>
			</div>
		</Dark_Surface>
	</Dialog.Popup>
}

/**
 |
 | One snapshot.
 |
 | The width is the slide's own; the height, the column arrangement and the
 | scrolling all come from the track above, because they only exist above the
 | gate and the track is where the gate is expressed. A `<section>` rather than
 | a `<div>` because that is what each of these is — a self-contained part of
 | the edition being read.
 |
 */
function Slide ( { children }: { children: ReactNode } ) {
	return <section className="lg:w-8c mx-auto lg:px-4">
		<div>{ children }</div>
	</section>
}
