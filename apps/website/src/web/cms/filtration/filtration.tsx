
/**
 |
 | The filtration form.
 |
 | One form, drawn twice on every page that has one: inline in the sidebar from
 | the medium breakpoint upward, and inside a bottom drawer below it. It knows
 | about neither — `filtration-widget.tsx` decides where it goes, and this
 | decides only what it asks and when the answer counts.
 |
 | # The draft lives in a ref
 |
 | Lifted from the static site, along with the reasoning. Nothing here renders
 | *from* the in-progress selection: there is no counter, no preview and no
 | button that enables itself, because each checkbox draws its own state. Held
 | in React state instead, every tick would re-render the whole form for nothing
 | anybody can see.
 |
 | The day this form grows something that reads the draft mid-edit — a "3
 | selected" count, a "Clear all" that disables itself — the ref has to become
 | state. Reaching for `draft.current` during a render is the signal.
 |
 | # `reset_token`
 |
 | When it changes, the draft goes back to the committed filters and the
 | checkboxes snap back with it. The drawer passes its own open flag, so each
 | opening starts from what is actually being shown; the inline copy passes a
 | constant, because there is no opening and closing there and a reset would
 | throw away a selection nobody asked to discard.
 |
 | The key sits on the `CheckboxGroup` rather than on this component, so that
 | resetting the inputs does not also collapse every fieldset a visitor opened.
 | An earlier revision of the static site keyed the whole widget and lost the
 | accordion's state on every open.
 |
 | # Auto-apply
 |
 | From the medium breakpoint up there is no submit button, so a change has to
 | commit itself. The gate is a ref rather than state for the same reason the
 | draft is: crossing the breakpoint should not re-render the form.
 |
 | **The breakpoint is 1024, not 768** — see `breakpoint.ts` for the defect this
 | fixes.
 |
 */

import type { ReactNode } from "react"
import { useRef } from "react"
import { Accordion } from "@base-ui/react/accordion"
import { Checkbox } from "@base-ui/react/checkbox"
import { CheckboxGroup } from "@base-ui/react/checkbox-group"
import { Field } from "@base-ui/react/field"
import { Fieldset } from "@base-ui/react/fieldset"

import type {
	Facet,
	Option,
} from "./facets.ts"
import type { Filters } from "./filter-sessions.ts"
import type { Role } from "../context-colours.ts"

import { FROM_THE_MEDIUM_BREAKPOINT } from "./breakpoint.ts"
import { role_of_category } from "../sessions.ts"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"
import { Check_Mark } from "#infra/lib/ui/react/icons/check-mark.tsx"
import { Chevron_Up } from "#infra/lib/ui/react/icons/chevron-up.tsx"
import { Icon_Button } from "#infra/lib/ui/react/buttons/icon-button.tsx"
import { use_media_query_event } from "#infra/lib/ui/react/use-media-query-event.tsx"
import { X_Mark } from "#infra/lib/ui/react/icons/x-mark.tsx"

/** The dot beside a category's name, in that category's own colour. */
const ROLE_BACKGROUND: Record<Role, string> = {
	contributor: "bg-collaborator",
	conversation: "bg-conversation",
	experience: "bg-experience",
	showcase: "bg-showcase",
	theme: "bg-theme",
	workshop: "bg-workshop",
}

type Filtration_Props = {
	className?: string
	facets: Facet[]
	/** The committed filters, which the draft starts from and resets to. */
	committed: Filters
	/**
	 |
	 | Commit the draft. Passed in from the widget, which reads it while it is
	 | still inside the Sessions provider — the form itself renders through the
	 | tunnel and would otherwise resolve `use_apply_filters` at the tunnel's
	 | destination, where no provider sits above it.
	 |
	 */
	apply: ( filters: Filters ) => void
	/**
	 |
	 | Changing this resets the draft and the inputs. Pass something stable to
	 | turn resets off.
	 |
	 */
	reset_token: unknown
	/**
	 |
	 | Called by the close button and after a submit. Absent on the inline copy,
	 | where there is nothing to dismiss and no close button is drawn.
	 |
	 */
	on_dismiss?: () => void
}

export function Filtration (
	{ apply, className = "", committed, facets, on_dismiss, reset_token }:
		Filtration_Props,
) {
	const draft = useRef<Filters>( committed )

	// Reset on a changed token. Comparing the previous value during render is
	// React's own sanctioned way to reset on a prop change without an effect,
	// and mutating a ref during render triggers no re-render.
	const last_token = useRef( reset_token )

	if ( last_token.current !== reset_token ) {
		last_token.current = reset_token
		draft.current = committed
	}

	const auto_applies = useRef( false )

	use_media_query_event( FROM_THE_MEDIUM_BREAKPOINT, () => {
		auto_applies.current = true

		return () => {
			auto_applies.current = false
		}
	} )

	const commit_if_automatic = () => {
		if ( auto_applies.current ) {
			apply( draft.current )
		}
	}

	if ( facets.length === 0 ) {
		return null
	}

	return <div className={ className }>
		<div className="md:hidden flex justify-between items-center rounded-t-lg p-4 bg-gray-light">
			<p className="text-h4 font-semibold text-theme">Filters</p>

			{ on_dismiss && <Icon_Button
				aria-label="Close the filters"
				colour="black"
				onClick={ on_dismiss }>
				<X_Mark />
			</Icon_Button> }
		</div>

		<form
			className="md:mt-8 max-md:p-4 md:pr-8 bg-white md:bg-transparent"
			onSubmit={ ( event ) => {
				event.preventDefault()
				apply( draft.current )
				on_dismiss?.()
			} }>
			{
				/* The first facet opens with the widget; the rest start
			     closed. `Accordion.Root` holds its open state in React, so it
			     has to stay outside anything the reset remounts.

			     With a single facet the accordion is skipped altogether — a
			     collapsible pane whose only job is to hide the one question
			     the widget is asking is a control worth nothing. The facet
			     renders permanently open instead. */
			}
			<Accordion.Root
				className="max-md:max-h-[60vh] overflow-auto [&>*:last-child]:border-none"
				defaultValue={ [ facets[0].name ] }>
				{ facets.map( ( facet ) =>
					<Facet_Field
						key={ facet.name }
						className="[&:not(:first-child)]:mt-6 [&:not(:last-child)]:pb-2 border-b-2 border-black/5 md:border-black/10"
						collapsible={ facets.length > 1 }
						committed={ committed[facet.name] }
						facet={ facet }
						on_change={ ( selected ) => {
							draft.current = {
								...draft.current,
								[facet.name]: selected,
							}
							commit_if_automatic()
						} }
						reset_token={ reset_token } />
				) }
			</Accordion.Root>

			{
				/* Hidden from the medium breakpoint up, where every change has
			     already committed itself. */
			}
			<div className="md:hidden relative -mt-4 pt-6 max-md:bg-white">
				<Button
					className="w-full"
					color="theme"
					emphasis="solid"
					size="md"
					type="submit">
					Apply Filter
				</Button>
			</div>
		</form>
	</div>
}

/**
 |
 | One facet: a heading that collapses, and a group of checkboxes under it.
 |
 | The accordion item and everything down to the checkbox group are
 | deliberately **not** keyed. Their open state has to survive a reset, and only
 | the inputs inside are meant to snap back.
 |
 */
function Facet_Field (
	{
		className = "",
		collapsible = true,
		committed,
		facet,
		on_change,
		reset_token,
	}: {
		className?: string
		/**
		 |
		 | Whether this facet may be hidden behind a trigger. False when it is
		 | the widget's only facet — see `Filtration`'s note.
		 |
		 */
		collapsible?: boolean
		committed: string[]
		facet: Facet
		on_change: ( selected: string[] ) => void
		reset_token: unknown
	},
) {
	// Base UI warns when an uncontrolled `CheckboxGroup`'s `defaultValue`
	// changes after mount, and the committed filters are a new array on every
	// apply. Snapshotting it and refreshing the snapshot only when the token
	// changes means the group sees a new default exactly when the key below
	// remounts it to read one — same trigger, same cadence, nothing stale.
	const captured = useRef( committed )
	const last_token = useRef( reset_token )

	if ( last_token.current !== reset_token ) {
		last_token.current = reset_token
		captured.current = committed
	}

	const options = <Fieldset.Root className={ collapsible ? "-mt-4" : "" }>
		<Fieldset.Legend className="sr-only">
			{ facet.heading }
		</Fieldset.Legend>

		<CheckboxGroup
			defaultValue={ captured.current }
			key={ String( reset_token ) }
			onValueChange={ on_change }>
			{ facet.options.map( ( option ) =>
				<Facet_Option
					key={ option.value }
					option={ option } />
			) }
		</CheckboxGroup>
	</Fieldset.Root>

	if ( !collapsible ) {
		return <Field.Root className={ className } name={ facet.name }>
			{
				/* A `p` rather than a heading, for the reason the collapsible
			     branch below gives. */
			}
			<p className="pb-4 text-p text-black">{ facet.heading }</p>

			{ options }
		</Field.Root>
	}

	return <Field.Root className={ className } name={ facet.name }>
		<Accordion.Item value={ facet.name }>
			{
				/* A `p` rather than a heading. The widget is a control that
			     travels between the sidebar and a drawer, so its parts are not
			     sections of the document a reader is navigating — and the
			     fieldset's own legend already names the group for assistive
			     technology. */
			}
			<Accordion.Header render={ <p className="group" /> }>
				<Accordion.Trigger className="flex w-full pb-4 justify-between items-center text-p text-black cursor-pointer">
					{ facet.heading }
					<Chevron_Up className="rotate-180 group-data-[open]:rotate-0 transition-transform duration-200" />
				</Accordion.Trigger>
			</Accordion.Header>

			<Accordion.Panel
				className="overflow-hidden transition-[height] duration-200 ease-out h-[var(--accordion-panel-height)] data-[starting-style]:h-0 data-[ending-style]:h-0"
				hiddenUntilFound
				keepMounted>
				{ options }
			</Accordion.Panel>
		</Accordion.Item>
	</Field.Root>
}

function Facet_Option ( { option }: { option: Option } ) {
	return <Field.Item className="[&:not(:last-child)]:border-b border-black/10 md:border-black/20">
		<Field.Label className="flex py-4 items-center gap-4 cursor-pointer text-small font-semibold md:font-medium">
			<Checkbox.Root
				className="inline-block size-4 shrink-0 border-[1.5px] border-current rounded-[5px] text-black"
				value={ option.value }>
				<Checkbox.Indicator>
					<Check_Mark className="size-full pt-[3px] pr-0.5 pb-0.5 pl-[3px]" />
				</Checkbox.Indicator>
			</Checkbox.Root>

			<Option_Label option={ option } />
		</Field.Label>
	</Field.Item>
}

/**
 |
 | The words, and — where the option names a category — a dot in that
 | category's colour at the far end of the row.
 |
 | The dot is decorative: the words beside it say which category it is, so an
 | announcement of the colour would be the same fact twice.
 |
 */
function Option_Label ( { option }: { option: Option } ): ReactNode {
	if ( !option.category ) {
		return option.label
	}

	return <span className="grow inline-flex justify-between items-center">
		<span>{ option.label }</span>
		<span
			aria-hidden={ true }
			className={ `size-4 rounded-full ${
				ROLE_BACKGROUND[role_of_category( option.category )]
			}` } />
	</span>
}
