
/**
 |
 | The registration form's contexts and their reader hooks, deliberately in a
 | module of their own.
 |
 | KEEP THIS FILE A LEAF. It must import nothing from the registration
 | components, and they must never import each other in a cycle back through it.
 |
 | Two reasons, both about `createContext` running exactly once:
 |
 |   1. A cycle — `Registration_Provider` rendering `Registration_Form_Host`
 |      while the host reads these hooks — leaves Vite unable to place a Fast
 |      Refresh boundary. It invalidates and re-executes both modules,
 |      `createContext` runs again, and the fresh context objects no longer
 |      match the ones the mounted tree is providing. Consumers that were not
 |      re-executed then read the default value, and `use_registration_actions`
 |      throws on every edit.
 |
 |   2. A module that exports anything other than components is not a Fast
 |      Refresh boundary. Keeping these hooks out of the provider leaves that
 |      file exporting a single component, so it refreshes in place.
 |
 | Both contexts are documented where they are populated, in
 | `registration-provider.tsx`.
 |
 */

import type { RefObject } from "react"
import {
	createContext,
	useContext,
} from "react"

export type Registration_Focus = {
	name: string
	selection_start: number | null
	selection_end: number | null
}

export type Registration_Draft = {
	form_ref: RefObject<HTMLFormElement | null>
	values_ref: RefObject<Record<string, string>>
	/** Checkboxes, keyed by `checkbox_key( name, value )` — they share names. */
	checked_ref: RefObject<Record<string, boolean>>
	focus_ref: RefObject<Registration_Focus | null>

	/*
	 | Whether Submit has been pressed. It is the ONLY thing standing between
	 | the form's opinion of itself and the visitor seeing it: silent until the
	 | first attempt, live from then on.
	 |
	 | It rides in the draft rather than in component state for the same reason
	 | the values do — the breakpoint swap would otherwise wipe it, and a form
	 | that quietly forgot it had already been argued with would be lying.
	 |
	 | The MESSAGES themselves are not kept anywhere, because they are derived:
	 | one pass over the <form> reproduces them exactly. Only what cannot be
	 | recomputed from the DOM is stored.
	 */
	attempted_ref: RefObject<boolean>
}

export type Registration_Actions = {
	open: () => void
	close: () => void

	/*
	 | Called once, by the form, when a submission goes through. TERMINAL:
	 | there is no action that undoes it. From here on the container houses the
	 | post-submission screen and nothing else, for the lifetime of the provider
	 | — closing and reopening lands back on the same screen.
	 |
	 | "For the lifetime of the provider" is a shorter life than it sounds: the
	 | provider is mounted per page, so a client-side navigation to another
	 | page unmounts it and the visitor is back at an empty form. That is
	 | accepted, and it is worth knowing that the "Explore More" button on the
	 | post-submission screen therefore CLOSES rather than navigates — a
	 | navigation would throw away the very state that put it on screen.
	 */
	confirm: () => void

	draft: Registration_Draft
}

/** Stable identity for the lifetime of the page — see the provider. */
export const Registration_Actions_Context = createContext<
	Registration_Actions | null
>( null )

/** Changes on every open and close. Read it only where that matters. */
export const Registration_Open_Context = createContext( false )

/*
 | Flips false → true once, and never back. A context of its own rather than a
 | second field on the open context, for the same reason there are two contexts
 | in the first place: a reader that only wants one of them should not
 | re-render for the other. The bottom-of-page trigger wants this one and not
 | much else — see the note on its reveal delay.
 */
export const Registration_Submitted_Context = createContext( false )

export function use_registration_actions (): Registration_Actions {
	const actions = useContext( Registration_Actions_Context )

	if ( !actions ) {
		throw new Error(
			"Registration components must be rendered within "
				+ "<Registration_Provider>.",
		)
	}

	return actions
}

export function use_registration_is_open (): boolean {
	return useContext( Registration_Open_Context )
}

export function use_registration_is_submitted (): boolean {
	return useContext( Registration_Submitted_Context )
}
