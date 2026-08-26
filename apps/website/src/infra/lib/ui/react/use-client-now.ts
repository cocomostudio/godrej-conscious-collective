
/**
 |
 | The clock, but only once there is one worth reading.
 |
 | It answers **null while rendering on the server and through hydration**, and
 | the moment of mounting thereafter. Null is not "unknown yet" to be worked
 | around — it is the answer, and a caller is expected to have something
 | sensible to say without a clock.
 |
 | ─── WHY A COMPONENT MAY NOT READ THE CLOCK WHILE RENDERING ─────────────────
 |
 | Page responses are cached, keyed by pathname and cleared by a publish. A
 | decision made against `Date.now()` during server rendering is therefore
 | frozen into a cache entry: right for the visitor who caused it to be
 | written, and progressively wrong for everybody served it afterwards, with
 | nothing to invalidate it because nothing was published.
 |
 | So the server renders the answer that does not depend on the time, and the
 | browser — where the clock is the visitor's own and nothing is cached —
 | corrects it on arrival.
 |
 | ─── AND WHY IT IS AN EFFECT RATHER THAN AN INITIAL VALUE ───────────────────
 |
 | Reading the clock in `useState`'s initialiser would run it during hydration
 | too, where the server's markup is what React is checking against — a
 | mismatch, and one that changes on every reload. The effect runs after that
 | check has passed, which is the only moment the two can honestly disagree.
 |
 | It does not tick. Nothing here needs a second-by-second answer: a control
 | decides once, on arrival, whether the thing it offers is still ahead.
 |
 */

import {
	useEffect,
	useState,
} from "react"

export function use_client_now (): number | null {
	const [ now, set_now ] = useState<number | null>( null )

	useEffect( () => {
		set_now( Date.now() )
	}, [] )

	return now
}
