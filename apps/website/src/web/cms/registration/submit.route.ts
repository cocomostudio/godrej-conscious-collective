
/**
 |
 | `POST /registration` — the relay.
 |
 | A resource route with an action and no component. Everything protecting the
 | endpoint happens here, in this order, and the order is the design:
 |
 |   1. **Rate limit by address.** First, because it is the cheapest check
 |      there is and the only one that caps a caller who is doing everything
 |      else correctly.
 |   2. **The form token.** Verified before the body is looked at, because the
 |      honeypot's field name is inside it and the body cannot be understood
 |      without knowing which field is the trap.
 |   3. **The honeypot.** Filled means a script that fills every input it
 |      finds.
 |   4. **The schema.** Unknown fields rejected outright, every string capped.
 |
 | The `Origin` header is nowhere in that list, deliberately. A browser sets it
 | honestly and anything that is not a browser sets whatever it likes, so a rule
 | built on it turns away the honest caller and waves the other one through.
 |
 | ─── WHAT A REFUSAL SAYS ────────────────────────────────────────────────────
 |
 | Very little, and on purpose. A visitor gets one sentence they can act on;
 | the reason goes to the server's log. Telling a caller which of four checks
 | they failed is telling them what to change.
 |
 | The **honeypot is the exception in the other direction**: a filled trap
 | answers 200 and records nothing. A script that is told it failed learns the
 | trap exists; one that is thanked goes away satisfied.
 |
 */

import * as v from "valibot"

import type { Route } from "./+types/submit.route.ts"

import { answer, too_many_attempts } from "./answers.ts"
import { verify_form_token } from "./form-token.server.ts"
import { record_attempt } from "./rate-limit.server.ts"
import { relay_submission } from "./relay.server.ts"
import { SUBMISSION_SCHEMA } from "./submission.ts"

import { client_address } from "#infra/server/web/client-address.ts"

/** One sentence, the same one however the submission was refused. */
const REFUSED =
	"We could not record your registration. Please close this and try again."

const UNAVAILABLE =
	"Registrations are not being accepted at the moment. Please try again later."

export async function action ( { context, request }: Route.ActionArgs ) {
	if ( request.method !== "POST" ) {
		return answer( { error: "method-not-allowed" }, 405 )
	}

	const address = client_address( context )

	const verdict = record_attempt( address )

	if ( !verdict.allowed ) {
		return too_many_attempts(
			verdict.retry_after_seconds,
			"Too many attempts. Please try again shortly.",
		)
	}

	const body = await read_body( request )

	if ( !body ) {
		return answer( { message: REFUSED }, 400 )
	}

	const form_token = typeof body.form_token === "string"
		? body.form_token
		: ""

	const token = verify_form_token( form_token, address )

	if ( !token.ok ) {
		if ( token.reason === "unconfigured" ) {
			console.error(
				`REGISTRATION_TOKEN_SECRET is unset, so no submission can be `
					+ `verified and none is being recorded.`,
			)

			return answer( { message: UNAVAILABLE }, 503 )
		}

		console.warn(
			`[registration] A submission was refused: ${token.reason}.`,
		)

		return answer( { message: REFUSED }, 400 )
	}

	// A signal, not a verdict — this was the open call on the ticket, and it
	// went to "soft". Logged so that how often it happens is a question with
	// an answer, rather than a reason to have rejected people pre-emptively.
	if ( token.address_changed ) {
		console.info(
			`[registration] A submission arrived from a different address than `
				+ `the one that opened the form. Accepted — a mobile handover `
				+ `and a VPN reconnect both look exactly like this.`,
		)
	}

	// The trap. Answering 200 is the point: a script told it failed learns the
	// trap is there and stops filling it, and the next one this catches is
	// none.
	if ( filled( body[token.honeypot] ) ) {
		console.warn(
			`[registration] A submission filled the honeypot and was `
				+ `discarded. It was answered as though it had succeeded.`,
		)

		return answer( { recorded: true }, 200 )
	}

	// Stripped before parsing, because the schema rejects unknown fields
	// outright and the honeypot IS an unknown field — an empty trap arriving
	// exactly as the form rendered it must not be what refuses the
	// submission.
	const { [token.honeypot]: _trap, ...rest } = body

	const parsed = v.safeParse( SUBMISSION_SCHEMA, rest )

	if ( !parsed.success ) {
		console.warn(
			`[registration] A submission failed the schema: `
				+ `${
					parsed.issues.map( ( issue ) => issue.message ).join(
						"; ",
					)
				}`,
		)

		return answer( { message: REFUSED }, 400 )
	}

	const relayed = await relay_submission( parsed.output )

	if ( !relayed.recorded ) {
		return answer(
			{
				message: relayed.reason === "unconfigured"
					? UNAVAILABLE
					: REFUSED,
			},
			relayed.reason === "unconfigured" ? 503 : 502,
		)
	}

	return answer( { recorded: true }, 201 )
}

async function read_body ( request: Request ) {
	try {
		const body = await request.json()

		return body && typeof body === "object" && !Array.isArray( body )
			? body as Record<string, unknown>
			: null
	} catch {
		return null
	}
}

/**
 |
 | A trap counts as sprung only when something was actually typed into it.
 |
 | An absent field and an empty string are the same thing here: a browser
 | submits an untouched text input as `""`, and treating that as a bot would
 | discard every real registration there is.
 |
 */
function filled ( value: unknown ) {
	return typeof value === "string" && value.trim() !== ""
}
