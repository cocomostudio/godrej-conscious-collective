
/**
 |
 | The colour a block draws its words in.
 |
 | Four tokens and no more — `context`, which is the page's own colour and
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
 | What arrives on a block: one of the four, or nothing at all.
 |
 */
export type Text_Color = string | null | undefined

/**
 |
 | **A missing value is the block's own colour, and `null` is a missing value.**
 |
 | A schema default is applied when a row is written, not when one is read, so
 | every entry saved before a component gained the attribute comes back with
 | `null` in it — and a default parameter would not catch that, because `null`
 | is a value a caller passed.
 |
 | The fallback stays the caller's argument rather than becoming a constant
 | here, and every caller now passes `context`. It used to be the one place the
 | four components disagreed — prose fell back to black and a heading to the
 | context colour, because that is what each had always drawn. They no longer
 | disagree: the schema's default is `context` on all four, and "what this block
 | draws when nobody answered" is a question the schema and the renderer must
 | not give two answers to.
 |
 */
export function text_color_token (
	text_color: Text_Color,
	fallback: Text_Color_Token,
): Text_Color_Token {
	return text_color && text_color in CLASSES
		? text_color as Text_Color_Token
		: fallback
}

export function text_color_class (
	text_color: Text_Color,
	fallback: Text_Color_Token,
) {
	return CLASSES[text_color_token( text_color, fallback )]
}
