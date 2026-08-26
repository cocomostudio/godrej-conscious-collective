
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
 | # What black means over a dark ground
 |
 | **It means nothing, so it is not drawn.** That is the one place this
 | overrides rather than defaults, and the reason is the schema rather than
 | taste.
 |
 | `text_color` defaults to `black`, and a Strapi default is written into the
 | row **when it is saved**, not read at render time. So there is no such thing
 | as an unset `text_color` on anything an editor has touched: every WYSIWYG in
 | the catalogue carries the literal string `black` whether anybody chose it or
 | not. A rule that respected the stored value would therefore respect a choice
 | nobody made, and every snapshot in the Archive's dialog would be black words
 | on a black slide. That is not hypothetical — it is what the first seeded
 | dialog actually rendered.
 |
 | `white` and `context` are honoured, because those are values only a person
 | types. Black is treated as the absence of an answer, and the ground answers
 | instead.
 |
 | A caption is simpler still: it carries no `text_color` at all, so there is
 | never anything to weigh, and it just follows the ground.
 |
 */

import {
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

export function Dark_Surface ( { children }: { children: ReactNode } ) {
	return <Dark_Surface_Context value={ true }>
		{ children }
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
 | The fallback is the caller's because the components never shared one — prose
 | has always been black and a heading has always been the context colour. On a
 | white page this is exactly `text_color_token`. On a dark one it is that,
 | except that `black` is read as no answer and the fallback is used instead.
 |
 | **Every component carrying `text_color` asks this**, not just the two whose
 | stored default is `black`. A heading defaults to `context` and is therefore
 | legible on a dark ground without help — but an editor who stored `black` on
 | one still gets black words on a black slide, and there is no ground on which
 | that is what they meant.
 |
 */
export function use_text_colour_token (
	text_color: Text_Color,
	fallback: Text_Color_Token,
): Text_Color_Token {
	const dark = use_dark_surface()
	const chosen = text_color_token( text_color, fallback )

	if ( !dark || chosen !== "black" ) {
		return chosen
	}

	// The fallback is what this block draws when nobody has answered, and on a
	// dark ground that is what a stored `black` amounts to. Except when the
	// fallback is itself `black` — prose — where there is nothing behind it to
	// fall back to and white is the only legible answer.
	return fallback === "black" ? "white" : fallback
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
