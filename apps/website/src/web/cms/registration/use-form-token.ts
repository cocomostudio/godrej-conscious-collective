
/**
 |
 | Getting a form token, in the browser.
 |
 | **Fetched when the overlay opens, never during server rendering.** Page
 | responses are cached, so a token rendered into the HTML would be identical
 | for every visitor holding that cache entry, with an age measuring the entry
 | rather than the visitor — which is the single use and the timing check gone
 | in one stroke. So the form asks for one at the moment somebody actually opens
 | it, which is also the moment the timing check should start counting from.
 |
 | Two things come back: the token, and the **name of the honeypot field**. The
 | name rotates daily and the form cannot know it in advance, which is why it is
 | handed over rather than written down.
 |
 | ─── ONE TOKEN PER OPENING, NOT PER MOUNT ───────────────────────────────────
 |
 | This lives in the provider rather than in the form, because the form remounts
 | when the viewport crosses the medium breakpoint. A second mint there would
 | restart the timing check — a visitor who rotated their phone after two
 | minutes of typing would be told they were too fast — and, worse, would lose
 | the record of whether the held token had already been spent.
 |
 | ─── SPENT IS TRACKED HERE, AND THAT IS THE POINT ───────────────────────────
 |
 | A token is spent the moment the relay verifies it, which is well before the
 | CMS is asked for anything. So a submission that fails at the CMS — or one
 | whose connection dropped on the way back — has already burned its token, and
 | pressing Register again with the same one is refused as a replay. The visitor
 | would see a form that fails identically however many times they try, with
 | nothing to suggest that closing and reopening would fix it.
 |
 | `take()` is the whole answer: it hands over the held token and marks it gone,
 | and mints a fresh one when the held one is already gone. The caller does not
 | have to know any of this, and — because the state is here rather than in the
 | form — a breakpoint swap between the failure and the retry cannot forget it.
 |
 | ─── THE PROMISE IS KEPT, NOT JUST THE VALUE ────────────────────────────────
 |
 | `ensure` hands back the in-flight request when there is one, so a visitor who
 | opens the overlay and presses Register a second later waits for the mint
 | already running rather than starting a second one. Two mints would spend two
 | of the five requests a minute the rate limiter allows.
 |
 */

import {
	useCallback,
	useRef,
	useState,
} from "react"

export type Form_Token = {
	token: string
	honeypot: string
}

const TOKEN_PATH = "/registration/token"

export function use_form_token () {
	/**
	 |
	 | The held token, as state because the form renders the honeypot field from
	 | its name, and as a ref beside it because `take` has to read the current
	 | value from inside a callback that does not re-run.
	 |
	 */
	const [ minted, set_minted ] = useState<Form_Token | null>( null )
	const held = useRef<Form_Token | null>( null )

	const spent = useRef( false )

	// The request in flight, so a second caller joins the first rather than
	// starting another.
	const pending = useRef<Promise<Form_Token | null> | null>( null )

	const mint = useCallback( async (): Promise<Form_Token | null> => {
		if ( pending.current ) {
			return await pending.current
		}

		const request = fetch( TOKEN_PATH, {
			headers: { accept: "application/json" },
		} )
			.then( async ( response ) => {
				if ( !response.ok ) {
					return null
				}

				const body = await response.json() as Partial<Form_Token>

				return typeof body.token === "string"
						&& typeof body.honeypot === "string"
					? { honeypot: body.honeypot, token: body.token }
					: null
			} )
			.catch( () => null )
			.then( ( result ) => {
				// Cleared either way. A mint that failed — the visitor is
				// offline, or the rate limiter turned them away — must be
				// retryable, and holding a settled rejection here would make
				// every later attempt fail with the same answer.
				pending.current = null
				held.current = result
				spent.current = false
				set_minted( result )

				return result
			} )

		pending.current = request

		return await request
	}, [] )

	/**
	 |
	 | Called when the overlay opens. A no-op when one is already held and
	 | unspent, so reopening a form the visitor dismissed does not spend one of
	 | the five requests a minute for a token that is still good.
	 |
	 */
	const ensure = useCallback( async () => {
		if ( held.current && !spent.current ) {
			return held.current
		}

		return await mint()
	}, [ mint ] )

	/**
	 |
	 | Hand the token over, and treat it as gone.
	 |
	 | Gone BEFORE the request rather than after it: a request that never comes
	 | back may still have been verified at the far end, so the only safe
	 | assumption is that anything handed out has been used.
	 |
	 */
	const take = useCallback( async () => {
		const token = held.current && !spent.current
			? held.current
			: await mint()

		spent.current = true

		return token
	}, [ mint ] )

	/**
	 |
	 | After a submission has gone through there is no form left to hold a
	 | token for, and a spent one is worse than none — the form would render a
	 | honeypot named after a trap the server refuses the next submission for
	 | reusing.
	 |
	 */
	const forget = useCallback( () => {
		pending.current = null
		held.current = null
		spent.current = false
		set_minted( null )
	}, [] )

	return { ensure, forget, minted, take }
}
