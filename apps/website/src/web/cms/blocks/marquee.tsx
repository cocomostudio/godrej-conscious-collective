
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
 */

import { use_auto_scrolling_strip } from "#infra/lib/ui/react/embla-carousel/use-auto-scrolling-strip.ts"

import { BLOCK_SPACING } from "./block-spacing.ts"

type Marquee_Props = {
	items?: { content?: string | null }[]
}

export function Marquee ( { items = [] }: Marquee_Props ) {
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
		className={ `${BLOCK_SPACING} py-4 bg-black text-h4 font-semibold text-experience` }>
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
