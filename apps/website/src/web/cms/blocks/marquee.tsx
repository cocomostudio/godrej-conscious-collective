
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
 | **The bar is black or white**, as its `background_color` says, and black
 | when nobody said.
 |
 | **Each item draws its words in its own `text_color`.** The items are plain
 | strings, and a plain string carries the attribute. `auto` means the opposite
 | of the bar: white on black, and black on white. An editor who picks the
 | bar's own colour makes that item invisible, and avoiding that is the
 | editor's job.
 |
 | **The design has the ticker butting straight against whatever sits above and
 | below it**, which is what `spacing_around` says out loud: set it to "none"
 | and the block carries no margin and the section lays down no padding at that
 | edge. It is a decision an editor makes rather than one this component makes
 | for them, so a ticker that does want air around it can have it. Either way it
 | runs out to both edges of the column it is in, as a full-bleed image does:
 | the window on a one-column page, and the white box on a two-column one. The
 | `py-4` is the bar's own height rather than spacing around it.
 |
 | The section's padding is not undone here but never laid down: a block cannot
 | undo padding from inside it, so the section reads this attribute off the
 | block at its edge before it pads. That makes a **section of its own** the
 | place for a flush ticker, which is where the design puts it.
 |
 */

import { use_auto_scrolling_strip } from "#infra/lib/ui/react/embla-carousel/use-auto-scrolling-strip.ts"

import type { Spacing_Around } from "./block-spacing.ts"

import type { Text_Color } from "./text-color.ts"

import { block_spacing } from "./block-spacing.ts"
import { use_column_bleed } from "./section-frame.tsx"
import { text_color_class } from "./text-color.ts"

/**
 |
 | Each bar's own class, and the text colour an item nobody coloured falls
 | back to on it.
 |
 */
const BARS = {
	black: { background: "bg-black", text_fallback: "white" },
	white: { background: "bg-white", text_fallback: "black" },
} as const

type Marquee_Background = keyof typeof BARS

type Marquee_Props = {
	/** `null` on every marquee saved before the attribute existed. */
	background_color?: Marquee_Background | null
	items?: { content?: string | null; text_color?: Text_Color }[]
	spacing_around?: Spacing_Around
}

export function Marquee (
	{ background_color, items = [], spacing_around }: Marquee_Props,
) {
	const bleed = use_column_bleed()
	const bar = BARS[background_color ?? "black"] ?? BARS.black

	const slides = items.flatMap( ( item ) =>
		item?.content
			? [ {
				content: item.content,
				text_class: text_color_class( item.text_color, bar.text_fallback ),
			} ]
			: []
	)

	const { repeat_count, track_ref, viewport_ref } = use_auto_scrolling_strip(
		slides.length,
	)

	if ( slides.length === 0 ) {
		return null
	}

	return <div
		className={ `${bleed} ${
			block_spacing( spacing_around )
		} py-4 ${bar.background} text-h4 font-semibold` }>
		<div className="overflow-hidden" ref={ viewport_ref }>
			<ul
				className="inline-flex *:after:content-['·'] *:after:ml-8"
				ref={ track_ref }>
				{ Array.from( { length: repeat_count } ).flatMap( (
					_unused,
					repetition,
				) => slides.map( ( item, index ) =>
					<li
						className={ `shrink-0 pr-8 ${item.text_class}` }
						aria-hidden={ repetition > 0 }
						key={ `${repetition}-${index}` }>
						{ item.content }
					</li>
				) ) }
			</ul>
		</div>
	</div>
}
