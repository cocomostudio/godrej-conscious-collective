
/**
 |
 | The address a request came from, carried from Express into the router.
 |
 | A loader is handed a Fetch `Request`, which has headers and nothing else —
 | no socket, no `req.ip`. The address is a fact only the Express layer holds,
 | so it is put on the load context there and read back out here.
 |
 | **Read from `req.ip`, deliberately, rather than from `X-Forwarded-For`.**
 | That header is trivially forged by anything that is not a browser, so
 | trusting it unconditionally would hand every rate-limited caller an
 | unlimited supply of identities. `req.ip` answers the socket's address until
 | Express is told `trust proxy`, and answers the correct client hop once it
 | is — which is exactly the decision a deployment makes and this code should
 | not be second-guessing.
 |
 | That decision arrives as `TRUST_PROXY` in the environment, defaulting to
 | false, and is applied to **both** Express instances — the outer server and
 | the inner one this handler runs on, because `req.ip` resolves against the
 | setting of the app handling the request and that is the inner one.
 |
 | The fallback is a single bucket rather than a random value. An address that
 | could not be determined must not become a fresh identity per request, which
 | is a rate limiter that does not limit.
 |
 */

import { createContext } from "react-router"
import type { RouterContextProvider } from "react-router"

export const UNKNOWN_ADDRESS = "unknown"

export const CLIENT_ADDRESS = createContext<string>( UNKNOWN_ADDRESS )

/**
 |
 | `Readonly<RouterContextProvider>` is what a loader and an action are handed —
 | the same object with `set` taken off the type, because a route reads
 | request-scoped values and does not write them. Naming that here rather than
 | the writable type is what lets both call sites pass their own `context`
 | straight through.
 |
 */
export function client_address (
	context: Readonly<RouterContextProvider>,
): string {
	return context.get( CLIENT_ADDRESS ) || UNKNOWN_ADDRESS
}
