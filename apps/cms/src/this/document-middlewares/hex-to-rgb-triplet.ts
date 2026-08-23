
/**
 |
 | `#0055E6` → `0, 85, 230`.
 |
 | The website's colour tokens compile to `rgba( var( --ctx-theme-color ),
 | <alpha-value> )`, so every context colour has to reach the browser as three
 | bare channels. A hex value in that slot would make `bg-theme/35` emit
 | `color-mix()`, which none of Safari 15, Firefox 92 or Chrome 94 supports —
 | the floor this design ships against, and the reason Tailwind stays on v3.
 |
 | An alpha channel, if one is present, is dropped: the alpha in these tokens is
 | the utility's own opacity modifier, and a colour carrying its own would fight
 | it.
 |
 | Anything unparseable answers `null` rather than throwing. The colour picker
 | cannot produce one, and a page whose triplet is missing falls back to the
 | hardcoded palette — which is a degradation the website already has to handle,
 | because an event may carry no colours at all.
 |
 */

const SHORT = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i
const LONG = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i

export function hex_to_rgb_triplet ( value: unknown ): string | null {
	if ( typeof value !== "string" ) {
		return null
	}

	const hex = value.trim()
	const short = SHORT.exec( hex )

	if ( short ) {
		return triplet( short.slice( 1 ).map( ( digit ) => digit + digit ) )
	}

	const long = LONG.exec( hex )

	return long ? triplet( long.slice( 1 ) ) : null
}

function triplet ( channels: string[] ) {
	return channels
		.map( ( channel ) => Number.parseInt( channel, 16 ) )
		.join( ", " )
}
