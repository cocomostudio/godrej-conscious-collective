
/**
 |
 | The icons a button may name, keyed by the name a caller writes.
 |
 | The key is what appears in the markup — `<Button.Icon name="chevron-left" />`
 | — and the value is the file beside this one. They are spelled the same on
 | purpose: the map exists so that the set of legal names is a type rather than
 | a guess, not to rename anything.
 |
 | The icons are lifted from the static site, which is why more of them are here
 | than this build has yet asked for. They come as one set; taking them
 | piecemeal would mean re-lifting the same directory once per ticket.
 |
 */

export const ICON_MAP = {
	"calendar": "calendar",
	"chevron-down": "chevron-down",
	"chevron-left": "chevron-left",
	"chevron-right": "chevron-right",
	"chevron-up": "chevron-up",
	"download": "download",
	"hamburger-menu": "hamburger-menu",
	"x-mark": "x-mark",
}
