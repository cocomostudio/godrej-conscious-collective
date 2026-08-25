
/**
 |
 | What the container houses once a submission has gone through. It replaces the
 | form outright — see the provider for why that is terminal — and the two never
 | share the screen except for the length of the drawer's morph.
 |
 | THE NAME comes out of the draft rather than out of a snapshot taken at
 | submit. It can, because a successful submission clears nothing: the draft
 | that fed the `<form>` is still sitting in `values_ref` and cannot change
 | again, since there is no longer a form to change it. Reading a ref during
 | render is safe for exactly that reason.
 |
 | THE EVENT'S NAME is the one thing that changed in the lift. The static site
 | wrote "Conscious Collective 2025" into the copy; here it comes from the main
 | event, like everything else the chrome advertises. With no event marked main
 | the sentence simply says the confirmation is on its way, which is still true.
 |
 | FOCUS is not this component's business, deliberately. On a REOPEN the popup
 | is opening around it and Base UI's `initialFocus` owns the question; on the
 | SWAP nothing is opening, so the stage moves focus here itself. Only the stage
 | can tell those two apart, so only the stage decides — an unconditional
 | focus-on-mount here fought Base UI on the reopen and left focus on `<body>`.
 |
 | The badge is NOT part of this component. It overhangs the container's top
 | edge, and the drawer's morph clips everything inside the animating box — so
 | it is rendered as a sibling of that box instead. See the stage.
 |
 */

import type { Event } from "../envelope.ts"

import { use_registration_actions } from "./registration-context.ts"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"
import { Check_Mark } from "#infra/lib/ui/react/icons/check-mark.tsx"

export function Registration_Confirmation (
	{ className = "", main_event }: {
		className?: string
		main_event: Event | null
	},
) {
	const { close, draft } = use_registration_actions()

	const values = draft.values_ref.current
	const name = [ values.first_name, values.last_name ]
		.map( ( part ) => ( part ?? "" ).trim() )
		.filter( Boolean )
		.join( " " )

	return <div className={ `flex flex-col ${className}` }>
		{
			/* A plain `<h2>`, deliberately not `Dialog.Title` / `Drawer.Title`.
		     The container's accessible name stays the RSVP line it has always
		     been, and the host keeps exactly one title element on screen to
		     carry it — Base UI's store holds a single `titleElementId` and
		     clears it unconditionally on unmount, so a second title here would
		     take the container's name away with it when the morph ended. */
		}
		<h2 className="text-h4 text-theme">
			{ name
				? <>
					Your registration is confirmed, <br />
					<span className="font-semibold">{ name }</span>
				</>
				: <>Your registration is confirmed</> }
		</h2>

		<p className="mt-4 text-p text-black">
			You should receive an email confirming your registration
			{ main_event && <>for { main_event.name }</> } shortly.
		</p>

		<p className="mt-4 text-p text-black">
			Drop in anytime - talks and workshops run on a schedule, and art
			installations are open all day.
		</p>

		{
			/* Closes; it does not navigate. The registration provider is
		     mounted per page, so a client-side navigation would unmount the
		     very state that put this screen on the page, and the visitor would
		     find an empty form waiting for them. */
		}
		<Button
			className="mt-8 w-full"
			size="lg"
			color="theme"
			emphasis="solid"
			onClick={ close }>
			Explore More
		</Button>
	</div>
}

/*
 | The tick. It straddles the container's top edge — half of it is over the
 | backdrop — which is the whole reason it is rendered outside the box that
 | animates, and the reason the dialog popup no longer clips its own overflow.
 |
 | The white ring is only ever seen on the half above the edge; the half below
 | it is white on white.
 |
 | `aria-hidden`, and no text of its own: the heading it sits beside already
 | says the same thing in words.
 |
 | THE PUNCH. `data-morph` is set on the group in the stage, so these do nothing
 | at all from the medium breakpoint up, where the swap is a single frame and
 | the attribute never appears. The overshoot is in the easing curve; the scale
 | only ever goes to 1.
 |
 | `-translate-y-1/2` is what straddles the edge, and Tailwind composes it into
 | the same transform as the scale — translate first, so the scale happens about
 | a centre that is already sitting on the edge.
 |
 | `--morph-fade` is declared on that same group and reaches here by
 | inheritance, so the tick arrives on the confirmation's beat without this file
 | knowing a single number.
 */
const BADGE_CLASS = [
	"absolute -translate-y-1/2 rounded-full pointer-events-none",
	"flex justify-center items-center",
	"bg-green text-white ring-8 ring-white",
	"transition-[opacity,transform] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
	"duration-[var(--morph-fade)] delay-[var(--morph-fade)]",
	"group-data-[morph=start]/stage:transition-none",
	"group-data-[morph=start]/stage:opacity-0 group-data-[morph=start]/stage:scale-50",
].join( " " )

export function Registration_Confirmation_Badge (
	{ className = "" }: { className?: string },
) {
	return <span aria-hidden="true" className={ `${BADGE_CLASS} ${className}` }>
		<Check_Mark className="size-8" />
	</span>
}
