
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
 | **It is the one block that leaves no space around itself at all.** The design
 | has the ticker butting straight against whatever sits above and below it, so
 | it carries none of the block spacing every other block carries, and it runs
 | out to both edges of the section. The `py-4` is the black bar's own height
 | rather than spacing around it.
 |
 | The section's padding is not undone here but never laid down: a block cannot
 | undo padding from inside it, so `section-frame.tsx` names this component as
 | padding-free and a section holding nothing else pads nothing. That makes a
 | **section of its own** the place for it, which is where the design puts it.
 |
 */

import { use_auto_scrolling_strip } from "#infra/lib/ui/react/embla-carousel/use-auto-scrolling-strip.ts"

import { use_full_bleed } from "./section-frame.tsx"

type Marquee_Props = {
	items?: { content?: string | null }[]
}

export function Marquee ( { items = [] }: Marquee_Props ) {
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
		className={ `${full_bleed} py-4 bg-black text-h4 font-semibold text-experience` }>
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
