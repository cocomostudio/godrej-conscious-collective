
/**
 |
 | `GET /registration/token` — the mint.
 |
 | A resource route: no component, no markup, one JSON answer. It is called when
 | the registration overlay OPENS, and that lateness is the whole design. Page
 | responses are cached, so a token minted during server rendering would be
 | identical for every visitor holding that cache entry, with an age measuring
 | the entry rather than the visitor — which is both the single use and the
 | timing check gone.
 |
 | It answers two things: the token, and the name of the honeypot field the form
 | should render. The name rotates daily and the form cannot know it in advance,
 | which is the point of handing it over here.
 |
 | **Rate limited**, because it is public and unauthenticated. A bot that wants
 | a fresh token per submission has to come here for each one, and this is the
 | layer that caps how often it may.
 |
 | `Cache-Control: no-store` is not decoration. An intermediary that cached this
 | would hand the same token to everybody it served, which is precisely the
 | failure the lazy mint exists to avoid — reintroduced one layer further out.
 |
 */

import type { Route } from "./+types/token.route.ts"

import { answer, too_many_attempts } from "./answers.ts"
import { mint_form_token } from "./form-token.server.ts"
import { record_attempt } from "./rate-limit.server.ts"

import { client_address } from "#infra/server/web/client-address.ts"

export async function loader ( { context }: Route.LoaderArgs ) {
	const address = client_address( context )
	const verdict = record_attempt( address )

	if ( !verdict.allowed ) {
		return too_many_attempts(
			verdict.retry_after_seconds,
			"Too many attempts. Please try again shortly.",
		)
	}

	const minted = mint_form_token( address )

	if ( !minted ) {
		console.error(
			`REGISTRATION_TOKEN_SECRET is unset, so no form token could be `
				+ `minted and the registration form cannot be submitted.`,
		)

		return answer( { error: "unavailable" }, 503 )
	}

	return answer( { honeypot: minted.honeypot, token: minted.token }, 200 )
}
