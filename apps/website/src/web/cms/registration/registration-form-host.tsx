
/**
 |
 | Picks the container the form is housed in: `Drawer` below the medium
 | breakpoint, `Dialog` from it up. Exactly one is mounted at a time — two live
 | popups would each install a focus trap and a scroll lock and fight over both.
 |
 | Everything the visitor has typed is held in refs on the provider, so the
 | remount this swap causes is survivable. See the comment block there.
 |
 | Both containers lead with the same headline, "RSVP for 11-14 December 2025".
 | From the medium breakpoint up it is simply the dialog's header line. Below it
 | is the same line the trigger at the bottom of the page shows, and the drawer
 | goes to some length to look like that trigger rising — see THE RISE below.
 |
 | ─── WHAT CHANGED IN THE LIFT ───────────────────────────────────────────────
 |
 | Two things, and nothing else. The headline's dates come from the **main
 | event** rather than from a string in the source. And the slideshow's pictures
 | come from the **page shell**, where an editor puts them, rather than from an
 | array of placeholder URLs — which is why the dialog's two-column row collapses
 | to one when a shell carries no pictures: half a card of empty grey is worse
 | than a narrower card.
 |
 */

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Drawer } from "@base-ui/react/drawer"

import type {
	Event,
	Media,
	Page_Shell,
} from "../envelope.ts"
import type { Form_Token } from "./use-form-token.ts"
import type { Slide } from "./slideshow.tsx"

import { SCREEN } from "../channels.ts"
import { media_url } from "../media.ts"
import { Registration_Form } from "./registration-form.tsx"
import { Registration_Stage } from "./registration-stage.tsx"
import {
	Registration_Confirmation,
	Registration_Confirmation_Badge,
} from "./registration-confirmation.tsx"
import { Slideshow } from "./slideshow.tsx"
import {
	use_registration_actions,
	use_registration_is_open,
	use_registration_is_submitted,
} from "./registration-context.ts"
import {
	HEADLINE_INNER_CLASS,
	HEADLINE_ROW_CLASS,
	registration_headline,
} from "./registration-headline.tsx"
import { use_media_origin } from "../media-origin.tsx"

import { Fill } from "#infra/lib/ui/react/slot-and-fill.tsx"
import { Plus } from "#infra/lib/ui/react/icons/plus.tsx"
import { use_media_query_matches } from "#infra/lib/ui/react/use-media-query-matches.ts"
import { X_Mark } from "#infra/lib/ui/react/icons/x-mark.tsx"

// Read off the breakpoint constant rather than hard-coded. The header's
// Register Now is a `md:` variant, and if the two ever disagree there is a band
// of viewport widths with a visible trigger and no container for it to open.
const DIALOG_QUERY = "( min-width: 1024px )"

// Above the site header, which raises itself to `max-md:z-50` while its own nav
// overlay is open. The screen channel renders ahead of the page content, so at
// equal z-index the header would win on document order.
const CONTAINER_CLASS = "relative z-60"

const BACKDROP_CLASS =
	"fixed inset-0 bg-black/40 transition-opacity duration-200 ease-out"
	+ " " + "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"

/*
 |
 | THE RISE — how the drawer pretends to be the trigger.
 |
 | Closed, the drawer does not sit fully off-screen: it rests exactly one
 | headline row proud of the bottom edge, `calc( 100% - 4rem )` down. That row
 | lands precisely where the trigger is, and a FACSIMILE of the trigger — same
 | copy, same theme background, same Plus — is painted over it. The real trigger
 | goes invisible in the same commit, so the first frame of the animation is
 | pixel-identical to the last frame before it.
 |
 | From there one transform carries everything up together, which is why the
 | facsimile rides at exactly the drawer's speed: it is not being animated in
 | sympathy, it is a child of the thing being animated. Once the drawer is up,
 | the facsimile fades out and reveals the real header line beneath it — same
 | copy, but theme-coloured on white, and closing the drawer rather than
 | opening it.
 |
 | THE BEATS, which are deliberately not symmetric:
 |
 |   open    0ms  the drawer starts rising AND the facsimile starts fading out,
 |                together. The swap happens under the visitor's finger, while
 |                everything is moving, rather than being announced afterwards.
 |          200ms the drawer is up. The fade finished at 150ms.
 |
 |   close   0ms  the drawer descends, header line still showing
 |          200ms it has landed on its peek — and only now does the facsimile
 |                fade back in, over a drawer that has stopped moving
 |          350ms the facsimile is solid, Base UI unmounts, and the real trigger
 |                takes over at exactly the same pixels
 |
 | The trigger's own `delay-350` is that last number. All of them move together
 | or not at all.
 |
 */

// `calc( 100% - 4rem )` is the peek, and 4rem is `HEADLINE_ROW_CLASS`'s `h-16`
// — written out because Tailwind's scanner reads class names as literal text
// and cannot follow a constant. `registration-headline.tsx` says the same thing
// from the other side.
//
// Two transitioned properties, and only one of them is motion.
//
// `transform` is the drawer: 200ms each way, no delay either way.
//
// `opacity` is a TIMER, and is never painted. Base UI unmounts the popup as
// soon as the POPUP'S OWN animations finish — `element.getAnimations()`, with
// no `subtree` — and on close the last thing still running is the facsimile's
// fade-in, on a child. Without something to wait for, the popup would be torn
// out at 200ms and that fade would never be seen. A zero-duration opacity
// change held until 350ms is that something: `delay + duration > 0` is all it
// takes for the browser to count it as a transition, it resolves at exactly the
// moment the fade completes, and the frame it would apply to is the frame Base
// UI removes.
const DRAWER_POPUP_CLASS = [
	"group",
	"fixed inset-x-0 bottom-0 max-h-[85vh] flex flex-col",
	"bg-white rounded-t-lg outline-none",
].join( " " )

const DRAWER_RISE_CLASS = [
	"transition-[transform,opacity] duration-[200ms,0ms] ease-out",
	"data-[starting-style]:translate-y-[calc(100%-4rem)]",
	"data-[ending-style]:translate-y-[calc(100%-4rem)]",
	"data-[ending-style]:opacity-0 data-[ending-style]:delay-[0ms,350ms]",
].join( " " )

/*
 | AND WHAT IS LEFT OF THE RISE AFTER A SUBMISSION: nothing.
 |
 | Every part of the illusion above depends on the drawer's top 4rem being a
 | copy of the trigger. The post-submission screen does not have that row — it
 | replaces the drawer's contents outright — so there is no facsimile, nothing
 | to rest proud of the bottom edge for, and nothing for the opacity TIMER to
 | hold the popup open for. All three go, and the drawer becomes an ordinary
 | sheet that slides the whole way out.
 |
 | The trigger drops its own `delay-350` in the same breath. Nothing is being
 | handed over any more, so nothing has to be waited for.
 */
const DRAWER_PLAIN_CLASS = [
	"transition-transform duration-200 ease-out",
	"data-[starting-style]:translate-y-full",
	"data-[ending-style]:translate-y-full",
].join( " " )

// Opacity reads inverted from the eye: the RESTING state is 0 — drawer up,
// facsimile gone, header line showing — and both transition states are 1.
//
// Which delay applies is decided by the state being transitioned TOWARDS, so
// the two directions are set in different places. Towards resting (on open)
// there is no delay, and the fade-out leaves with the rise. Towards
// ending-style (on close) there is 200ms of one, and the fade-in waits for the
// descent to finish.
const DRAWER_FACSIMILE_CLASS = [
	HEADLINE_ROW_CLASS,
	"absolute inset-0 bg-theme pointer-events-none",
	"opacity-0 transition-opacity duration-150 ease-out",
	"group-data-[starting-style]:opacity-100",
	"group-data-[ending-style]:opacity-100 group-data-[ending-style]:delay-200",
].join( " " )

const CLOSE_CLASS = "shrink-0 text-black cursor-pointer"

/*
 |
 | THE POST-SUBMISSION SCREEN, and the two ways it arrives.
 |
 | From the medium breakpoint up it is a SNAP — one frame, form gone, and the
 | popup is `w-4c` rather than `w-10c` on the very same frame. Below it the
 | drawer MORPHS: the box's height animates down, the old contents fade out, the
 | new fade in, the tick punches in over the top edge. The stage owns all of
 | that; the only thing decided here is which of the two happens.
 |
 | The tick straddles the container's top edge, and that is why the dialog popup
 | does not carry `overflow-hidden`. The clip lives one level down, on the
 | two-column row, which is where it does its real work anyway: the slideshow's
 | images are absolutely positioned and would otherwise square off the card's
 | rounded corners.
 |
 | `top-0` plus the badge's own `-translate-y-1/2` is what centres it ON the
 | edge rather than below it. The left offset matches the screen's padding, so
 | it lines up with the heading beneath it.
 |
 */

type Host_Props = {
	main_event: Event | null
	page_shell: Page_Shell | null
	form_token: Form_Token | null
	take_token: () => Promise<Form_Token | null>
}

export function Registration_Form_Host (
	{ form_token, main_event, page_shell, take_token }: Host_Props,
) {
	const is_open = use_registration_is_open()
	const is_submitted = use_registration_is_submitted()
	const { close, draft } = use_registration_actions()

	const origin = use_media_origin()
	const slides = slides_of( page_shell, origin )

	const as_dialog = use_media_query_matches( DIALOG_QUERY )
	const [ container, set_container ] = useState<HTMLDivElement | null>( null )

	const headline = registration_headline( main_event )

	const on_open_change = ( next_is_open: boolean ) => {
		if ( !next_is_open ) {
			close()
		}
	}

	// Only ever non-default straight after a breakpoint swap, because `close()`
	// clears the snapshot. `true` hands Base UI back its own default behaviour.
	const initial_focus = () => {
		// There is no form to put the caret back into, and the draft's snapshot
		// is about a field that no longer exists. Base UI's default finds the
		// first tabbable thing on the post-submission screen, which is the one
		// button on it — the same place the swap itself sends focus.
		if ( is_submitted ) {
			return true
		}

		const focus = draft.focus_ref.current
		const form = draft.form_ref.current

		if ( !focus || !form ) {
			return true
		}

		const control = form.elements.namedItem( focus.name )

		return control instanceof HTMLElement ? control : true
	}

	const form = <Registration_Form
		form_token={ form_token }
		take_token={ take_token } />

	// The registration form is only offered while there is an event to
	// register for, which is the same rule the header's Register Now follows.
	if ( !main_event ) {
		return null
	}

	return <Fill into={ SCREEN }>
		<div ref={ set_container } className={ CONTAINER_CLASS }>
			{ container && ( as_dialog
				? <Dialog.Root
					open={ is_open }
					onOpenChange={ on_open_change }>
					<Dialog.Portal container={ container }>
						<Dialog.Backdrop className={ BACKDROP_CLASS } />

						<Dialog.Viewport>
							{
								/* `max-h-[85vh]` matches the drawer's, and for
							     the same reason: the form is taller than a
							     short laptop viewport once its error messages
							     are out. Capped and scrolled beats a dialog
							     whose header and submit button are both off
							     the top and bottom of the screen with no way
							     to reach either. */
							}
							<Dialog.Popup
								initialFocus={ initial_focus }
								className={ [
									"fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
									"max-h-[85vh] flex flex-col",
									is_submitted
										? "w-4c"
										: slides.length > 0
										? "w-10c"
										: "w-5c",
									"bg-white rounded-lg outline-none",
									"transition-opacity duration-200 ease-out",
									"data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
								].join( " " ) }>
								{
									/* The container's accessible name, once the
								     header line that used to carry it has gone.
								     Rendered only when the form is not, so there
								     is never more than one title element alive:
								     Base UI keeps a single `titleElementId` and
								     clears it unconditionally on unmount, which
								     means two of them would cost the dialog its
								     name the moment either one left. */
								}
								{ is_submitted
									&& <Dialog.Title className="sr-only">
										{ headline }
									</Dialog.Title> }

								<Registration_Stage
									is_submitted={ is_submitted }
									className="rounded-lg"
									badge={ 
										<Registration_Confirmation_Badge className="top-0 left-6 size-18" />
									 }
									confirmation={ 
										<Registration_Confirmation
											className="px-8 pt-16 pb-8"
											main_event={ main_event } />
									 }
									form={
										/* `min-h-0` is what lets this row shrink
									     below its content height, which is what
									     hands the cap down to the column that
									     actually scrolls. Without it a flex item
									     refuses to go below `min-content` and the
									     cap does nothing.

									     The clip is here rather than on the popup,
									     so that the confirmation's tick can hang
									     over the popup's top edge. It still does
									     the job it always did: the slideshow's
									     images are absolutely positioned and would
									     square off the rounded corners without
									     it. */


											<div className="flex min-h-0 rounded-lg overflow-hidden">
												{
													/* No height of its own, by design.
											     The slideshow's images are
											     absolutely positioned, so this
											     column contributes nothing to the
											     row's height and simply stretches
											     to whatever the FORM column next to
											     it comes out at, capped by the
											     popup's `max-h-[85vh]`. A short
											     form gives a short slideshow. */
												}
												{ slides.length > 0
													&& <Slideshow
														slides={ slides }
														label="Photographs from previous gatherings"
														className="w-5c grow shrink-0" /> }

												<div className="w-5c grow shrink-0 p-8 overflow-y-auto">
													{
														/* The header line: the same
												     copy the trigger carries
												     below the medium
												     breakpoint, sitting above
												     the fields rather than over
												     them. */
													}
													<div className="flex justify-between items-center gap-4">
														<Dialog.Title className="text-h4 text-theme">
															{ headline }
														</Dialog.Title>

														<Dialog.Close
															className={ CLOSE_CLASS }
															aria-label="Close">
															<X_Mark />
														</Dialog.Close>
													</div>

													<div className="md:mt-8">
														{ form }
													</div>
												</div>
											</div>

									} />
							</Dialog.Popup>
						</Dialog.Viewport>
					</Dialog.Portal>
				</Dialog.Root>
				: <Drawer.Root
					open={ is_open }
					onOpenChange={ on_open_change }>
					<Drawer.Portal container={ container }>
						<Drawer.Backdrop className={ BACKDROP_CLASS } />

						<Drawer.Viewport>
							<Drawer.Popup
								initialFocus={ initial_focus }
								className={ `${DRAWER_POPUP_CLASS} ${
									is_submitted
										? DRAWER_PLAIN_CLASS
										: DRAWER_RISE_CLASS
								}` }>
								{
									/* See the dialog's copy of this: exactly one
								     title element, ever. Below the medium
								     breakpoint the pair actually overlap in
								     time — the outgoing form is on screen for
								     the whole morph — which is why the header
								     line below gives up being the title in the
								     same commit this one takes it over. */
								}
								{ is_submitted
									&& <Drawer.Title className="sr-only">
										{ headline }
									</Drawer.Title> }

								<Registration_Stage
									is_submitted={ is_submitted }
									morph
									className="rounded-t-lg overflow-hidden"
									badge={ 
										<Registration_Confirmation_Badge className="top-0 left-1ccm size-18" />
									 }
									confirmation={ 
										<Registration_Confirmation
											className="cc mx-auto pt-16 pb-8"
											main_event={ main_event } />
									 }
									form={ 
										<>
											{
												/* The header line and the facsimile
										     stack in the same 4rem box, and it
										     is the only part of the drawer that
										     does not scroll — it is the thing
										     the visitor pressed. */
											}
											<div className="relative shrink-0">
												<div
													className={ `${HEADLINE_ROW_CLASS} text-theme` }>
													{
														/* A `<div>`, not the
												     trigger's `<span>`:
												     `Drawer.Title` renders an
												     `<h2>`, which a `<span>`
												     may not contain. The class
												     is all these two sites need
												     to share. */
													}
													<div
														className={ HEADLINE_INNER_CLASS }>
														{
															/* Still the drawer's
													     title right up until
													     the submission, and a
													     plain heading from then
													     on. It is on screen for
													     the length of the morph,
													     fading, and two live
													     title elements would
													     leave the drawer
													     nameless as soon as this
													     one went. */
														}
														{ is_submitted
															? <h2 className="text-h4">
																{ headline }
															</h2>
															: <Drawer.Title className="text-h4">
																{ headline }
															</Drawer.Title> }

														<Drawer.Close
															className={ CLOSE_CLASS }
															aria-label="Close">
															<X_Mark />
														</Drawer.Close>
													</div>
												</div>

												{
													/* Decorative and inert:
											     everything it says is said
											     again, accessibly, by the header
											     line underneath it.

											     Gone for good after a submission.
											     It exists to sell the trigger
											     rising and falling, and neither
											     happens any more. */
												}
												{ !is_submitted
													&& <span
														aria-hidden="true"
														className={ DRAWER_FACSIMILE_CLASS }>
														<span
															className={ HEADLINE_INNER_CLASS }>
															<span className="text-h4 text-white">
																{ headline }
															</span>
															<Plus className="text-white" />
														</span>
													</span> }
											</div>

											<div className="min-h-0 overflow-y-auto">
												<div className="-mt-1 p-4 pt-0">
													{ form }
												</div>
											</div>
										</>
									 } />
							</Drawer.Popup>
						</Drawer.Viewport>
					</Drawer.Portal>
				</Drawer.Root> ) }
		</div>
	</Fill>
}

/**
 |
 | The pictures beside the form, from the page shell's own upload.
 |
 | An editor's `alternativeText` and `caption` are Strapi's own names for the
 | two things a slide can carry, and they mean here exactly what they mean in
 | the media library — so nothing is renamed on the way through.
 |
 | A shell with no pictures answers an empty list rather than placeholders, and
 | the dialog narrows to the form alone. There is no picture that would be
 | better than no picture.
 |
 */
function slides_of ( page_shell: Page_Shell | null, origin: string ): Slide[] {
	const uploaded = page_shell?.form_slideshow

	if ( !Array.isArray( uploaded ) ) {
		return []
	}

	return uploaded
		.map( ( file ): Slide | null => {
			const media = file as Media
			const src = media_url( media?.url, origin )

			return src
				? {
					alt: ( media.alternativeText as string | null ) ?? "",
					caption: ( media.caption as string | null )
						?? undefined,
					src,
				}
				: null
		} )
		.filter( ( slide ) => slide !== null )
}
