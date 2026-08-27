
/**
 |
 | Whether the blocks below are being drawn over a dark ground.
 |
 | The catalogue is written for a white page, and says so in a dozen small
 | places: a caption is `text-black`, prose falls back to black where an editor
 | picked nothing, and the image-and-content composite paints its floated
 | caption's own background white so the words clear the picture behind them.
 | Every one of those is right, and every one of them is wrong inside the
 | Archive's snapshot dialog, which is white on black.
 |
 | **The dark ground is a property of where a block is, not of the block.** The
 | same quotation is a grey card on an Archives page and a bare pull-quote
 | inside the dialog, and the editor did not choose either — they chose a
 | quotation. So it travels the way the media origin and the page's arrangement
 | do: a context set once, by whatever owns the dark ground, and read by
 | whichever blocks care. Nothing is threaded through a prop, because a block
 | can turn up at any depth and the dialog does not know what an editor put in
 | it.
 |
 | # The dialog forces its colours
 |
 | **Every word inside it is white, whatever the component carrying it asked
 | for**, and the context colour is pointed at white too, so a block drawing in
 | `text-context` or `border-context` is white as well.
 |
 | This is a forced colour and not a default a component may override, which is
 | the strongest form the rule has taken. It replaces an earlier one that read a
 | stored `black` as no answer at all — a rule that existed only because `black`
 | was the schema's default, so a stored `black` could not be told apart from a
 | value nobody chose.
 |
 | **Forcing is what lets the schema stop guessing.** The default is `auto` now,
 | which names the absence of an answer outright, so `black` is a choice again
 | and is drawn as one everywhere else — and the dialog does not have to weigh
 | any of it: nothing an editor picks can make a snapshot unreadable, and the
 | enclosing Archive component's admin description says so.
 |
 | A caption is simpler still: it carries no `text_color` at all, so there was
 | never anything to weigh, and it just follows the ground.
 |
 */

import {
	type CSSProperties,
	type ReactNode,
	createContext,
	use,
} from "react"

import type {
	Text_Color,
	Text_Color_Token,
} from "./blocks/text-color.ts"

import {
	text_color_class,
	text_color_token,
} from "./blocks/text-color.ts"

const Dark_Surface_Context = createContext<boolean>( false )

/**
 |
 | The context colour, forced to the static palette's white.
 |
 | Written as a custom property rather than swapped for a class, because that is
 | the whole mechanism: a block below carries `text-context` and knows nothing
 | about where it is, and re-pointing the alias is what makes the class draw
 | white. It is the third place in the codebase the alias is aimed, after the
 | page's root and a card's own element — see `context-colours.ts`.
 |
 */
const FORCED_CONTEXT = {
	"--ctx-context-color": "var( --color-white )",
} as CSSProperties

/**
 |
 | `display: contents` because this element exists only to carry a declaration.
 | The dialog lays its own children out, and a box in the middle of that would
 | be a box the design never asked for.
 |
 */
export function Dark_Surface ( { children }: { children: ReactNode } ) {
	return <Dark_Surface_Context value={ true }>
		<div className="contents" style={ FORCED_CONTEXT }>
			{ children }
		</div>
	</Dark_Surface_Context>
}

export function use_dark_surface () {
	return use( Dark_Surface_Context )
}

/**
 |
 | The colour a block draws its words in, given what an editor stored and what
 | that block's own default is.
 |
 | The fallback is the caller's because the four components disagree about it,
 | and the schema declines to settle the disagreement: it stores `auto`, which
 | means nobody answered. `null` — every row written before the attribute
 | existed — means the same thing, and `text_color_token` treats the two alike.
 |
 | On a white page this is exactly `text_color_token`. On a dark one it is
 | white, full stop: **every component carrying `text_color` asks this**, so
 | one answer here is what makes the dialog's guarantee hold however deeply a
 | block is nested inside it.
 |
 */
export function use_text_colour_token (
	text_color: Text_Color,
	fallback: Text_Color_Token,
): Text_Color_Token {
	return use_dark_surface()
		? "white"
		: text_color_token( text_color, fallback )
}

/** The same answer as a class, for the blocks that want one. */
export function use_text_colour_class (
	text_color: Text_Color,
	fallback: Text_Color_Token,
) {
	return text_color_class(
		use_text_colour_token( text_color, fallback ),
		fallback,
	)
}
