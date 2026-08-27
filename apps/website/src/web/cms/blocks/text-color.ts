
/**
 |
 | The colour a block draws its words in.
 |
 | Four colours and no more — `context`, which is the page's own colour and
 | follows both the event it belongs to and the scheme its editor chose;
 | `theme`, which is the event's theme colour whatever the page is set to;
 | and plain `black` and `white`. They are the Tailwind colour tokens by exactly
 | those names, so what an editor picked is what ends up on the element and
 | there is no third vocabulary in between.
 |
 | `theme` is there because `context` stopped being the theme the moment a Page
 | could say otherwise: an editor writing a run of words on a black page has no
 | other way to ask for the event's colour.
 |
 | # `auto` is not a colour
 |
 | **The schema offers a fifth value, `auto`, and it is the absence of an answer
 | rather than an answer.** It is the default on all four components, so an
 | editor who has not thought about colour meets a named option rather than a
 | blank field — and, unlike a blank field, can pick it again after choosing
 | something else.
 |
 | It is deliberately not a key of `CLASSES` below, and `Text_Color_Token` is
 | deliberately the keys of `CLASSES`. That set is the colours a block can
 | actually be drawn in, which is exactly the set a *fallback* may name. Giving
 | `auto` a class here would turn the four components' differing answers into
 | one, which is the thing this module exists to keep apart.
 |
 | The four components of the **inner list** carry the attribute — heading,
 | plain string, WYSIWYG and link. Those four are the words on a page, and a
 | section that lays them over a dark ground needs every one of them to be able
 | to answer.
 |
 */

const CLASSES = {
	black: "text-black",
	context: "text-context",
	theme: "text-theme",
	white: "text-white",
}

export type Text_Color_Token = keyof typeof CLASSES

/**
 |
 | The stored value meaning nobody answered — the schema's default on all four.
 |
 */
const UNANSWERED = "auto"

/**
 |
 | What arrives on a block: one of the four colours, `auto`, or nothing at all.
 |
 */
export type Text_Color = string | null | undefined

/**
 |
 | **`auto` and a missing value are the same state, and it is the block's own
 | colour.**
 |
 | `auto` is what the schema writes onto every row saved from here on. A missing
 | value is what every row written before the attribute existed carries, because
 | a schema default is applied when a row is saved and not when one is read —
 | and a default parameter would not catch that, because `null` is a value a
 | caller passed. Two spellings of one state, and nothing downstream should have
 | to know which of them it got.
 |
 | The fallback stays the caller's argument rather than becoming a constant
 | here, because the four components genuinely disagree: a heading and a link
 | draw themselves in the page's own colour, and a plain string and a WYSIWYG's
 | prose in black. **That disagreement is why the schema declines to answer at
 | all** — one default across all four would have to pick a side, and picking
 | one repaints half the catalogue.
 |
 */
export function text_color_token (
	text_color: Text_Color,
	fallback: Text_Color_Token,
): Text_Color_Token {
	// `auto` is named here rather than left to fall through the `in CLASSES`
	// guard below. It reaches the same answer either way, and only one of the
	// two says out loud that a value the schema writes onto every row is meant
	// to land on the fallback.
	if ( !text_color || text_color === UNANSWERED ) {
		return fallback
	}

	return text_color in CLASSES
		? text_color as Text_Color_Token
		: fallback
}

export function text_color_class (
	text_color: Text_Color,
	fallback: Text_Color_Token,
) {
	return CLASSES[text_color_token( text_color, fallback )]
}
