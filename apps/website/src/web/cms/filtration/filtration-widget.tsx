
/**
 |
 | Where the filtration form goes, which is two places at once.
 |
 |   • **From the medium breakpoint upward** it sits inline in the sidebar,
 |     below everything the content type contributed, with no submit button and
 |     every change committing itself. It gets there through the tunnel: a
 |     listing component is in the main column, and the sidebar is the main
 |     column's sibling.
 |
 |   • **Below it** it is a bottom drawer, opened by the trigger in the
 |     listing's own header and dismissed by a close button, a backdrop press or
 |     an applied filter.
 |
 | Both copies are always mounted and each is hidden at the widths the other
 | owns, which is what lets the two be laid out entirely differently rather than
 | one being moved and made to fit twice.
 |
 | # On a one-column page, and the flicker on every other one
 |
 | A fill registers itself in a layout effect, which never runs on the server,
 | so nothing can tunnel until hydration. Left alone the fill answers "no slot"
 | on the server pass and renders the form where the listing stands — a form
 | painted in the main column and then taken out of it. That is the flicker.
 |
 | The static site hides that provisional copy with a rule on the place it is
 | written, which the browser has before it has any JavaScript and which
 | therefore cannot lag behind the move. This does the same, with the one
 | difference this build needs: there, every page the widget is written on has
 | a sidebar, so the origin is marked unconditionally. Here a one-column page
 | renders no sidebar and therefore no slot, so the copy standing at the origin
 | is the only one there will ever be, and hiding it would hide the widget.
 |
 | The page's arrangement answers which of the two this is, at render time and
 | identically on the server and in the browser. So the origin below is a box
 | with no display where the copy is only passing through, and a box with no
 | layout of its own where the copy stays. **The markup is served either way**
 | — what changes is only that it is never painted anywhere it is about to
 | leave.
 |
 | It fades in, because on a two-column page arriving is the one thing it
 | cannot do before hydration, and a form appearing beside a page already drawn
 | should look like it was on its way rather than like a correction.
 |
 | # Why the drawer travels too
 |
 | It portals into a screen-level channel at the very top of the page rather
 | than opening where it stands, because the listing's own header is sticky and
 | a drawer inside a sticky, scrolled, `z-index`-ed box is a drawer clipped by
 | it. The same channel is what the registration overlay will use.
 |
 */

import { useState } from "react"
import { Drawer } from "@base-ui/react/drawer"

import type { Facet } from "./facets.ts"

import { ONE_COLUMN } from "../assemble-root.ts"
import {
	SCREEN,
	SIDEBAR,
} from "../channels.ts"
import { use_page_layout } from "../page-layout.tsx"
import { Filtration } from "./filtration.tsx"
import {
	use_apply_filters,
	use_filters,
} from "./sessions.tsx"

import { Fill } from "#infra/lib/ui/react/slot-and-fill.tsx"

/**
 |
 | The inline copy never resets, so its token is a constant: there is no
 | opening and closing there, and the form is the only way to change what it
 | shows.
 |
 */
const NEVER_RESETS = "inline"

export function Filtration_Widget (
	{ facets, on_dismiss, visible }: {
		facets: Facet[]
		on_dismiss: () => void
		visible: boolean
	},
) {
	const committed = use_filters()
	// Captured here, where this widget sits inside the Sessions provider. Both
	// copies of the form render through the tunnel — the sidebar's slot and the
	// screen-level drawer — and neither could resolve the context at its own
	// destination.
	const apply = use_apply_filters()

	// Whether there is a sidebar to leave for, which is the same question as
	// whether there will be a slot to leave for: the root renders the one with
	// the other. See the note above.
	const has_sidebar = use_page_layout() !== ONE_COLUMN

	// The drawer's container has to exist before the portal can be told to use
	// it, so the element is held in state rather than in a ref — a ref would
	// be filled in after the render that needed it.
	const [ container, set_container ] = useState<HTMLDivElement | null>( null )

	if ( facets.length === 0 ) {
		return null
	}

	return <>
		{
			/* The origin: where the sidebar's copy is written, and where it
		     stays on a page that has no sidebar. `contents` there, so the
		     form lays out as though this element were not around it;
		     `hidden` where the copy is on its way out, so the one paint it
		     would otherwise get in the main column never happens. */
		}
		<div className={ has_sidebar ? "hidden" : "contents" }>
			<Fill into={ SIDEBAR } when_absent="inline">
				<Filtration
					apply={ apply }
					className="max-md:hidden w-full animate-[fade\_in_250ms_ease-in_forwards]"
					committed={ committed }
					facets={ facets }
					reset_token={ NEVER_RESETS } />
			</Fill>
		</div>

		<Fill into={ SCREEN }>
			<div className="relative z-40" ref={ set_container }>
				{ container && <Drawer.Root
					onOpenChange={ on_dismiss }
					open={ visible }>
					<Drawer.Portal container={ container } keepMounted>
						<Drawer.Backdrop className="fixed inset-0 bg-black/20 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />

						<Drawer.Viewport>
							<Drawer.Popup className="fixed inset-x-0 bottom-0 max-h-[80vh] bg-white rounded-t-lg outline-none transition-transform duration-200 ease-out data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full">
								{
									/* The open flag is the reset token, so
								     every opening starts from what the listing
								     is actually showing. The accordion sits
								     outside the keyed subtree, so which
								     fieldsets a visitor opened survives. */
								}
								<Filtration
									apply={ apply }
									className="after:absolute after:top-full after:size-full after:bg-white"
									committed={ committed }
									facets={ facets }
									on_dismiss={ on_dismiss }
									reset_token={ visible } />
							</Drawer.Popup>
						</Drawer.Viewport>
					</Drawer.Portal>
				</Drawer.Root> }
			</div>
		</Fill>
	</>
}
