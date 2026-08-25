
/**
 |
 | What opens the drawer, below the medium breakpoint.
 |
 | It lives in the listing's own header rather than beside the widget, because
 | the widget it opens is somewhere else entirely — in a screen-level channel at
 | the top of the page — and a trigger has to be where a visitor is looking.
 |
 | It is gone from the medium breakpoint up, where the widget is inline in the
 | sidebar and there is nothing to open.
 |
 | **The count is of facets, not of boxes.** "Filter (2)" means two questions
 | asked; three days and one age group is still two.
 |
 */

import type { Facet } from "./facets.ts"

import {
	facets_in_use,
	use_filters,
} from "./sessions.tsx"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

export function Filtration_Trigger (
	{ className = "", colour, facets, on_press }: {
		className?: string
		/** The header's own colour, which the trigger is drawn against. */
		colour: "theme" | "white"
		/**
		 |
		 | What the widget will offer. **The trigger takes it so that the two
		 | answer the same question from the same input** — a listing whose
		 | sessions all share one day, one age group and one admission has every
		 | facet dropped, and a button that opens an empty drawer is worse than
		 | no button.
		 |
		 */
		facets: Facet[]
		on_press: () => void
	},
) {
	const asked = facets_in_use( use_filters() )

	if ( facets.length === 0 ) {
		return null
	}

	return <Button
		className={ `md:hidden gap-4 ${className}` }
		color={ colour }
		emphasis="outline"
		onClick={ on_press }>
		{ asked > 0 ? `Filter (${asked})` : "Filter" }
		<Button.Icon name="chevron-down" />
	</Button>
}
