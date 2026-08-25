
/**
 |
 | The colour a block draws its words in.
 |
 | Three tokens and no more — `black`, `white`, and `context`, which is the
 | page's own colour and follows the event it belongs to. They are the Tailwind
 | colour tokens by exactly those names, so what an editor picked is what ends
 | up on the element and there is no third vocabulary in between.
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
	white: "text-white",
}

export type Text_Color_Token = keyof typeof CLASSES

/**
 |
 | What arrives on a block: one of the three, or nothing at all.
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
 | The fallback is the caller's rather than one constant here, because the four
 | components never shared a colour to begin with: prose has always been black
 | and a heading has always been the context colour. The attribute is there to
 | let an editor say otherwise, not to repaint the catalogue.
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
