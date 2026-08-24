
/**
 |
 | The site header, lifted from the static site.
 |
 | Two things changed in the lift and nothing else did: the navigation comes
 | from the page shell rather than from an array in the source, and the date
 | range and the Register Now button come from the **main event** — on every
 | page, always, including archived ones. A visitor who arrives on an old page
 | through an old link still has a route to the event that is running.
 |
 | ─── MOBILE NAVIGATION ( below md / 1024px ) ────────────────────────────────
 |
 | Ships in two layers.
 |
 | BASELINE — no JavaScript. A visually-hidden checkbox holds the open/closed
 | state and a `<label>` is the trigger, so the menu works on the mandated
 | browser floor (Safari 15 / Firefox 92 / Chrome 94) without `:has()`,
 | `<dialog>` or popover, none of which match there. The toggle is instantaneous.
 |
 | ENHANCED — after hydration the checkbox and label are swapped for a real
 | `<button>` carrying `aria-expanded`, plus the fade, Esc-to-close, a focus trap
 | and a scroll lock. ARIA cannot do the semantic job in the baseline: `checked`
 | is the only state that updates without JavaScript, so an authored
 | `aria-expanded="false"` would freeze and start lying the moment the menu was
 | opened. Better an odd-but-truthful checkbox than a confident falsehood.
 |
 | Two invariants hold this together — please preserve both:
 |
 |   1. The `<input>` is a DIRECT CHILD of `<header>`, not of the `cc` bar. That
 |      makes the overlay its SIBLING (so `peer-checked:` reaches it) while
 |      keeping the overlay outside the `cc` container's gutters, so it can go
 |      full-bleed and derive its offset from `top-full` rather than a
 |      hard-coded bar height.
 |
 |   2. There is exactly ONE overlay element, shared by both layers. Only the
 |      trigger is swapped, so React reconciles the overlay in place. Remounting
 |      it while open would blink the menu out and fade it back in.
 |
 */

import type { Ref } from "react"
import {
	useEffect,
	useRef,
	useState,
} from "react"
import { Link } from "react-router"

import type {
	Event,
	Link as Navigation_Link,
	Page_Shell,
} from "../envelope.ts"

import { Event_Date_Range } from "./event-date-range.tsx"
import { Nav_Link } from "../nav-link.tsx"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"
import { Arrow_Right } from "#infra/lib/ui/react/icons/arrow-right.tsx"
import { Hamburger_Menu } from "#infra/lib/ui/react/icons/hamburger-menu.tsx"
import { X_Mark } from "#infra/lib/ui/react/icons/x-mark.tsx"
import { Conscious_Collective_Logo } from "#infra/lib/ui/react/logos/conscious-collective-logo.tsx"
import { use_media_query_event } from "#infra/lib/ui/react/use-media-query-event.tsx"

const TOGGLE_ID = "site-nav-toggle"
const OVERLAY_ID = "site-nav-overlay"

// Kept in step with the `duration-200` utility on the overlay.
const FADE_DURATION_MS = 200

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button:not(:disabled)",
	"input:not(:disabled)",
	"select:not(:disabled)",
	"textarea:not(:disabled)",
	"[tabindex]:not([tabindex=\"-1\"])",
].join( ", " )

// One-off trigger styling, deliberately NOT `Button`: its base class carries
// `[&>svg~svg]:hidden`, which would unconditionally hide the second icon in the
// baseline's hamburger/cross pair.
const TRIGGER_CLASS =
	"md:hidden shrink-0 flex-0 inline-flex justify-center items-center"
	+ " " + "size-8.5 rounded cursor-pointer text-black"

// On the iPhone the navigation menu is cropped at the bottom and scrolling down
// snaps back up. Margin is what settles it.
const EXTRA_SPACE_FOR_IOS = "mobile-webkit:mb-28"

type Site_Header_Props = {
	main_event: Event | null
	page_shell: Page_Shell | null
}

export function Site_Header ( { main_event, page_shell }: Site_Header_Props ) {
	const links = page_shell?.navigation_header ?? []

	const [ is_enhanced, set_is_enhanced ] = useState( false )
	const [ is_open, set_is_open ] = useState( false )

	// `display` cannot be transitioned, and an `absolute` overlay left
	// permanently displayed contributes its full height to the page's scrollable
	// overflow — a phantom ~100vh of scroll below every header. So the closed
	// overlay must really be `hidden`, which means a two-step enter and a
	// deferred exit.
	const [ is_displayed, set_is_displayed ] = useState( false )
	const [ is_faded_in, set_is_faded_in ] = useState( false )

	const toggle_ref = useRef<HTMLInputElement>( null )
	const trigger_ref = useRef<HTMLButtonElement>( null )
	const overlay_ref = useRef<HTMLDivElement>( null )
	const restore_focus_ref = useRef( false )

	// ── Upgrade to the enhanced layer ──────────────────────────────────────
	// `useEffect`, not `useLayoutEffect`: the two layers render identically, so
	// there is nothing to hide before paint.
	useEffect( () => {
		const toggle = toggle_ref.current

		// Seed from the DOM. The CSS-only layer is live before hydration, so the
		// menu may already be open; without this the swap would snap it shut.
		// Seeding all three together also means the overlay arrives in its final
		// state, with no opacity change for the transition to animate.
		const open = toggle?.checked ?? false
		set_is_open( open )
		set_is_displayed( open )
		set_is_faded_in( open )

		restore_focus_ref.current = document.activeElement === toggle
		set_is_enhanced( true )
	}, [] )

	// If focus was sitting on the checkbox as it was removed, move it to the
	// button that replaced it rather than dropping it to `<body>`.
	useEffect( () => {
		if ( !is_enhanced || !restore_focus_ref.current ) {
			return
		}

		restore_focus_ref.current = false
		trigger_ref.current?.focus()
	}, [ is_enhanced ] )

	// ── Fade ───────────────────────────────────────────────────────────────
	useEffect( () => {
		if ( !is_enhanced ) {
			return
		}

		if ( is_open ) {
			set_is_displayed( true )

			// Next frame, so the browser has painted `display: block` at opacity
			// zero and the opacity change is something the transition can
			// animate from.
			const frame = requestAnimationFrame( () =>
				set_is_faded_in( true )
			)

			return () => cancelAnimationFrame( frame )
		}

		set_is_faded_in( false )

		// A timer rather than `transitionend`: under `prefers-reduced-motion` the
		// transition is suppressed and `transitionend` never fires, which would
		// strand the overlay in `display: block` — and the overflow with it.
		const timer = setTimeout(
			() => set_is_displayed( false ),
			FADE_DURATION_MS,
		)

		return () => clearTimeout( timer )
	}, [ is_enhanced, is_open ] )

	// ── Close when the viewport crosses into desktop ───────────────────────
	use_media_query_event( "( min-width: 1024px )", () => set_is_open( false ) )

	// ── Esc to close, and a focus trap ─────────────────────────────────────
	useEffect( () => {
		if ( !is_enhanced || !is_open ) {
			return
		}

		const on_keydown = ( event: KeyboardEvent ) => {
			if ( event.key === "Escape" ) {
				event.preventDefault()
				set_is_open( false )
				trigger_ref.current?.focus()
				return
			}

			if ( event.key !== "Tab" ) {
				return
			}

			const overlay = overlay_ref.current
			const trigger = trigger_ref.current

			if ( !overlay || !trigger ) {
				return
			}

			// The header bar stays visible, so the trigger — now a cross — is on
			// screen and belongs in the cycle alongside the overlay's own links.
			const focusables = [
				trigger,
				...overlay.querySelectorAll<HTMLElement>(
					FOCUSABLE_SELECTOR,
				),
			]
			const first = focusables[0]
			const last = focusables[focusables.length - 1]
			const active = document.activeElement as HTMLElement | null

			// `inert` would express this declaratively but is Chrome 102+ /
			// Safari 15.5+ / Firefox 112+ — outside the floor. Wrap by hand.
			if ( event.shiftKey && active === first ) {
				event.preventDefault()
				last.focus()
			} else if ( !event.shiftKey && active === last ) {
				event.preventDefault()
				first.focus()
			} else if ( !active || !focusables.includes( active ) ) {
				event.preventDefault()
				first.focus()
			}
		}

		document.addEventListener( "keydown", on_keydown )

		return () => document.removeEventListener( "keydown", on_keydown )
	}, [ is_enhanced, is_open ] )

	// ── Scroll lock ────────────────────────────────────────────────────────
	// The baseline relies on `overscroll-contain` alone; this is the
	// JavaScript-only half of the same job.
	useEffect( () => {
		if ( !is_enhanced || !is_open ) {
			return
		}

		const previous = document.body.style.overflow
		document.body.style.overflow = "hidden"

		return () => {
			document.body.style.overflow = previous
		}
	}, [ is_enhanced, is_open ] )

	// Closed-but-still-displayed links must leave the tab order. `aria-hidden`
	// alone would hide them from assistive technology while keeping them
	// reachable, which is worse than not hiding them at all.
	const overlay_is_reachable = !is_enhanced || is_open

	// `max-md:z-50` — the overlay lives inside this stacking context, so it can
	// never paint above something the header itself loses to. Page sections use
	// `z-10` too and win on document order, which let their content show through
	// the overlay. Raised only below `md`, where the overlay exists.
	return <header className="relative z-10 max-md:z-50 grow-0 shrink-0 bg-white shadow-[0_2px_4px_0] shadow-[rgba(0,0,0,0.08)] md:shadow-[0_4px_8px_0] md:shadow-[rgba(0,0,0,0.08)]">
		{
			/* INVARIANT 1 — direct child of `<header>`, ahead of both the bar and
		   | the overlay, so `peer-*` can reach them. */
		}
		{ !is_enhanced && <input
			ref={ toggle_ref }
			type="checkbox"
			id={ TOGGLE_ID }
			className="peer sr-only md:hidden"
			aria-label="Navigation menu" /> }

		{
			/* `z-10` keeps the bar painted above the overlay, which is what makes
		   | the header remain visible while the menu is open. */
		}
		<div className="cc mx-auto relative z-10 flex flex-wrap justify-between items-center py-4">
			<Link to="/">
				<Conscious_Collective_Logo className="text-black w-auto h-12 lg:h-16" />
			</Link>

			{ is_enhanced
				? <Nav_Trigger_Button
					ref={ trigger_ref }
					is_open={ is_open }
					on_toggle={ () => set_is_open( ( open ) => !open ) } />
				: <Nav_Trigger_Label /> }

			<div className="max-md:hidden flex gap-4 items-center">
				<p className="text-h4 text-black">
					<Event_Date_Range event={ main_event } />
				</p>

				<Register_Now event={ main_event } />
			</div>

			{
				/* Both navs carry the same label deliberately: at any given
			   | viewport exactly one of them is `display: none` and therefore
			   | absent from the accessibility tree, so the user always meets a
			   | single "Primary" nav. Qualifying them ("…on mobile") would leak
			   | layout into text that is read aloud. */
			}
			<nav
				aria-label="Primary"
				className="max-md:hidden mt-4 basis-full shrink-0">
				<Nav_Links
					className="flex gap-8 md:gap-6 lg:gap-8"
					links={ links } />
			</nav>
		</div>

		{
			/* INVARIANT 2 — one overlay, shared by both layers. Full-bleed because
		   | it sits outside the `cc` bar; `top-full` puts it exactly under that
		   | bar with no hard-coded height. */
		}
		<div
			ref={ overlay_ref }
			id={ OVERLAY_ID }
			aria-hidden={ overlay_is_reachable ? undefined : true }
			className={ [
				"md:hidden absolute top-full left-0 right-0 h-[calc(100vh_-_100%)]",
				"overflow-y-auto overscroll-contain bg-white",
				// The header's own drop shadow paints beneath its descendants, so
				// the overlay covers it. Re-create the same separator as an inset
				// shadow along the overlay's top edge.
				"shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.08)]",
				is_enhanced
					? [
						is_displayed ? "block" : "hidden",
						"transition-opacity duration-200 motion-reduce:transition-none",
						is_faded_in
							? "opacity-100"
							: "opacity-0 pointer-events-none",
					].join( " " )
					// Baseline: instantaneous, driven straight off the checkbox.
					: "hidden peer-checked:block",
			].join( " " ) }>
			<nav aria-label="Primary" className="cc mx-auto pt-4">
				<Nav_Links
					className={ `flex flex-col [&_a]:flex [&_a]:justify-between **-but-last:border-b-2 *-but-last:border-gray-light [&_a]:py-8 ${EXTRA_SPACE_FOR_IOS}` }
					links={ links }
					link_tab_index={ overlay_is_reachable ? undefined : -1 }
					on_link_click={ () => set_is_open( false ) } />
			</nav>
		</div>
	</header>
}

/**
 |
 | Register Now, from `md` up. Its counterpart below `md` is a sticky trigger at
 | the foot of the page.
 |
 | It follows the main event, per the decision that the chrome does: with no
 | event running there is nothing to register for, so the button is absent
 | rather than present and inert.
 |
 | The overlay it opens is the registration form, which is a later ticket. Until
 | then this is the button and nothing behind it.
 |
 */
function Register_Now ( { event }: { event: Event | null } ) {
	if ( !event ) {
		return null
	}

	return <Button
		size="lg"
		color="theme"
		emphasis="solid"
		aria-haspopup="dialog">
		Register Now
	</Button>
}

/** Baseline trigger. Both icons ship; the checkbox decides which one shows. */
function Nav_Trigger_Label () {
	return <label
		htmlFor={ TOGGLE_ID }
		className={ `${TRIGGER_CLASS} peer-focus-visible-deep:ring-2 peer-focus-visible-deep:ring-black` }>
		{
			/* `peer-checked-deep:` and `peer-focus-visible-deep:` are this
		   | project's variants for `.peer:checked ~ * &`. Stock `peer-*` is
		   | sibling-only, and these are descendants of a sibling. */
		}
		<Hamburger_Menu className="peer-checked-deep:hidden" />
		<X_Mark className="hidden peer-checked-deep:block" />
	</label>
}

/** Enhanced trigger. A real button, with state that JavaScript keeps truthful. */
function Nav_Trigger_Button ( { is_open, on_toggle, ref }: {
	ref?: Ref<HTMLButtonElement>
	is_open: boolean
	on_toggle: () => void
} ) {
	return <button
		ref={ ref }
		type="button"
		onClick={ on_toggle }
		aria-label="Navigation menu"
		aria-expanded={ is_open }
		aria-controls={ OVERLAY_ID }
		className={ `${TRIGGER_CLASS} focus-visible:ring-2 focus-visible:ring-black` }>
		{ is_open ? <X_Mark /> : <Hamburger_Menu /> }
	</button>
}

function Nav_Links ( { className = "", link_tab_index, links, on_link_click }: {
	className?: string
	links: Navigation_Link[]
	link_tab_index?: number
	on_link_click?: () => void
} ) {
	return <ul className={ className }>
		{ links.map( ( link, index ) =>
			<li key={ `${link.url}:${index}` }>
				<Nav_Link
					url={ link.url }
					className="text-h5 md:font-medium md:text-nav text-black"
					tabIndex={ link_tab_index }
					onClick={ on_link_click }>
					{ link.label }
					<Arrow_Right className="md:hidden" />
				</Nav_Link>
			</li>
		) }
	</ul>
}
