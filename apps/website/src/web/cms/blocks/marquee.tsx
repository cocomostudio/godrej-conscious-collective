
/**
 |
 | Marquee — a leaf. A line of short facts scrolling sideways, on its own.
 |
 | `items` is a **repeatable component list, not a region.** Its members carry
 | no `__component`, so they arrive as raw data; the block reads their strings
 | and lays them out itself.
 |
 | Every repeat past the first is hidden from assistive technology — a screen
 | reader should hear the venue once, not four times.
 |
 | **An item's own `text_color` is not read.** The items are plain strings, and
 | a plain string carries the attribute — but the ticker is one black bar with
 | one colour of words on it, and a bar whose items disagreed would not be the
 | design. The field is visible in the admin because Strapi configures a
 | component once for every place it is used; the schema's `items` description
 | says so.
 |
 | **The design has the ticker butting straight against whatever sits above and
 | below it**, which is what `spacing_around` says out loud: set it to "none"
 | and the block carries no margin and the section lays down no padding at that
 | edge. It is a decision an editor makes rather than one this component makes
 | for them, so a ticker that does want air around it can have it. Either way it
 | runs out to both edges of the section. The `py-4` is the black bar's own
 | height rather than spacing around it.
 |
 | The section's padding is not undone here but never laid down: a block cannot
 | undo padding from inside it, so the section reads this attribute off the
 | block at its edge before it pads. That makes a **section of its own** the
 | place for a flush ticker, which is where the design puts it.
 |
 */

import { use_auto_scrolling_strip } from "#infra/lib/ui/react/embla-carousel/use-auto-scrolling-strip.ts"

import type { Spacing_Around } from "./block-spacing.ts"

import { block_spacing } from "./block-spacing.ts"
import { use_full_bleed } from "./section-frame.tsx"

type Marquee_Props = {
	items?: { content?: string | null }[]
	spacing_around?: Spacing_Around
}

export function Marquee ( { items = [], spacing_around }: Marquee_Props ) {
	const full_bleed = use_full_bleed()

	const slides = items
		.map( ( item ) => item?.content )
		.filter( ( content ): content is string => Boolean( content ) )

	const { repeat_count, track_ref, viewport_ref } = use_auto_scrolling_strip(
		slides.length,
	)

	if ( slides.length === 0 ) {
		return null
	}

	return <div
		className={ `${full_bleed} ${
			block_spacing( spacing_around )
		} py-4 bg-black text-h4 font-semibold text-experience` }>
		<div className="overflow-hidden" ref={ viewport_ref }>
			<ul
				className="inline-flex *:after:content-['·'] *:after:ml-8"
				ref={ track_ref }>
				{ Array.from( { length: repeat_count } ).flatMap( (
					_unused,
					repetition,
				) => slides.map( ( item, index ) =>
					<li
						className="shrink-0 pr-8"
						aria-hidden={ repetition > 0 }
						key={ `${repetition}-${index}` }>
						{ item }
					</li>
				) ) }
			</ul>
		</div>
	</div>
}
