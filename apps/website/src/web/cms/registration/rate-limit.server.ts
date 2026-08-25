
/**
 |
 | Rate limiting by address: a small burst and a low sustained rate.
 |
 | **Five a minute and twenty an hour.** Generous for a human — nobody
 | registers twice, let alone five times — and useless to a script. Both
 | windows apply at once, so a script cannot spend its hour in the first two
 | minutes and a person who genuinely fumbles a submission four times is never
 | told to come back later.
 |
 | This is the layer that caps the one thing the form token cannot: the mint
 | endpoint is public, so a bot can fetch a fresh token per submission and
 | every single-use check will pass. What it cannot do is fetch six of them in
 | a minute from one address.
 |
 | ─── SLIDING, NOT FIXED ─────────────────────────────────────────────────────
 |
 | A fixed window resets on the clock, so a script that learns the boundary
 | gets its whole allowance twice in two seconds. This keeps the timestamps and
 | counts backwards from now, which costs an array per address and has no
 | boundary to learn.
 |
 | ─── THE STORE IS PER PROCESS ───────────────────────────────────────────────
 |
 | Same caveat as the spent-token set beside it: two instances behind a load
 | balancer each hold their own counts, so the real ceiling is the limit times
 | the number of instances. Stated rather than hidden. A shared store is the
 | fix and is a dependency this build does not have.
 |
 */

type Rate_Window = {
	label: string
	span_ms: number
	most: number
}

const WINDOWS: Rate_Window[] = [
	{ label: "a minute", most: 5, span_ms: 60 * 1000 },
	{ label: "an hour", most: 20, span_ms: 60 * 60 * 1000 },
]

const LONGEST_SPAN_MS = Math.max(
	...WINDOWS.map( ( limit ) => limit.span_ms ),
)

/**
 |
 | How many addresses are tracked at once.
 |
 | A cap rather than an unbounded map, because the keys come from whoever is
 | calling and a flood from many addresses would otherwise grow this without
 | limit. Eviction is oldest-first: an address whose last attempt is furthest
 | back is the one closest to falling out of every window anyway.
 |
 */
const MOST_ADDRESSES_HELD = 20_000

const attempts = new Map<string, number[]>()

export type Rate_Verdict =
	| { allowed: true }
	| { allowed: false; retry_after_seconds: number }

/**
 |
 | Records an attempt and says whether it is allowed.
 |
 | **The attempt is recorded either way.** A refused attempt that did not count
 | would let a script hammer the endpoint the moment it was refused, which is
 | the opposite of the point.
 |
 */
export function record_attempt (
	ip_address: string,
	now = Date.now(),
): Rate_Verdict {
	sweep( now )

	const history = ( attempts.get( ip_address ) ?? [] )
		.filter( ( at ) => now - at < LONGEST_SPAN_MS )

	history.push( now )

	if ( attempts.size >= MOST_ADDRESSES_HELD && !attempts.has( ip_address ) ) {
		const oldest = attempts.keys().next()

		if ( !oldest.done ) {
			attempts.delete( oldest.value )
		}
	}

	// Re-inserted rather than mutated in place, so the map's insertion order
	// stays "least recently seen first" and the eviction above evicts the
	// right key.
	attempts.delete( ip_address )
	attempts.set( ip_address, history )

	for ( const limit of WINDOWS ) {
		const within = history.filter( ( at ) => now - at < limit.span_ms )

		if ( within.length > limit.most ) {
			// When the oldest attempt in this window falls out of it, there is
			// room again. That is the honest answer, and it is what a caller
			// should be told to wait.
			const oldest = within[0]
			const clear_at = oldest + limit.span_ms

			return {
				allowed: false,
				retry_after_seconds: Math.max(
					1,
					Math.ceil( ( clear_at - now ) / 1000 ),
				),
			}
		}
	}

	return { allowed: true }
}

function sweep ( now: number ) {
	for ( const [ address, history ] of attempts ) {
		const last = history[history.length - 1]

		if ( last !== undefined && now - last < LONGEST_SPAN_MS ) {
			continue
		}

		attempts.delete( address )
	}
}

/** For the tests, which need an address with no history. */
export function forget_attempts () {
	attempts.clear()
}
