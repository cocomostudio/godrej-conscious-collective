
/**
 |
 | The signed form token, and the rotating honeypot name that travels inside it.
 |
 | **This is not a CSRF token.** Cross-site request forgery needs an ambient
 | credential to ride on, and this endpoint is unauthenticated, so a CSRF token
 | in the security sense would buy nothing. A signed token does three adjacent
 | jobs that are worth having:
 |
 |   1. it proves the submission came from a form this server actually served
 |   2. it supplies the timing check — how long ago the form was opened
 |   3. it carries the honeypot's field name, so the name can rotate without
 |      the verifier needing to remember what it issued
 |
 | ─── MINTING IS LAZY, AND THAT IS THE WHOLE POINT ───────────────────────────
 |
 | The token is minted by a resource route called when the overlay OPENS. It is
 | **not** minted during server rendering. Page responses are cached, and a
 | token baked into cached HTML would be identical for every visitor until the
 | next invalidation, with an age measuring the age of the cache entry rather
 | than the age of the visitor's form — destroying both the single use and the
 | timing check in one stroke.
 |
 | ─── MINTING IS STATELESS; ONLY CONSUMPTION WRITES ──────────────────────────
 |
 | Nothing is stored when a token is issued. The nonce is recorded only when a
 | token is SPENT, which is what makes a second submission with the same token
 | fail. A bot that fetches a thousand tokens and never uses them costs this
 | process nothing; what caps that is the rate limiter, not this.
 |
 | ─── TWO HONEST LIMITS ──────────────────────────────────────────────────────
 |
 | The mint endpoint is public, so a targeted bot fetches a fresh token per
 | submission. The rate limiter is what caps that, and this file does not
 | pretend otherwise.
 |
 | The IP hash is a **soft signal**, not a gate — see `verify_form_token`.
 |
 | ─── THE STORE IS PER PROCESS ───────────────────────────────────────────────
 |
 | The spent-nonce set lives in this process's memory. Two instances behind a
 | load balancer would each hold half of it, and a token spent on one could be
 | spent again on the other. That is a real hole and it is stated rather than
 | hidden: closing it means a shared store, which is a dependency this build
 | does not have. Every other layer — the schema, the rate limit, the honeypot,
 | the timing check — still applies on both instances.
 |
 */

import crypto from "node:crypto"

import { Environment } from "#infra/server/environment/index.ts"

/** The token's own version, so an old one can be refused rather than misread. */
const VERSION = "v1"

/**
 |
 | Older than this and the form has been sitting open long enough that the
 | visitor has probably wandered off, or the token has been in a script's
 | pocket. Thirty minutes is generous for a nine-field form.
 |
 */
const OLDEST_MS = 30 * 60 * 1000

/**
 |
 | Younger than this and nothing typed it. Three seconds is under the time it
 | takes a person to read the first label, and well over the time it takes a
 | script to fill nine fields.
 |
 */
const YOUNGEST_MS = 3 * 1000

/**
 |
 | Plausible names, none of them in a bot's skip list.
 |
 | A honeypot called `url`, `website` or `homepage` is a honeypot every
 | form-filler already knows to leave alone — those names are on every skip
 | list there is, because they were the first generation of this trick. These
 | read as fields a registration form might genuinely have, which is the only
 | property that matters: a script that fills every input it finds fills this
 | one, and a script that skips fields by name has no reason to skip these.
 |
 */
const HONEYPOT_NAMES = [
	"referral_code",
	"invitation_code",
	"promo_code",
	"member_number",
	"delegate_code",
	"access_code",
	"booking_reference",
]

export type Minted = {
	token: string
	honeypot: string
}

export type Verified =
	| {
		ok: true
		honeypot: string
		/**
		 |
		 | Whether the address submitting is the address that minted. **A
		 | signal, not a verdict** — the caller records it and carries on. See
		 | the note on `verify_form_token`.
		 |
		 */
		address_changed: boolean
	}
	| { ok: false; reason: Refusal }

export type Refusal =
	| "unconfigured"
	| "malformed"
	| "bad-signature"
	| "expired"
	| "too-fast"
	| "already-used"

/**
 |
 | A token for one visitor, one form, one submission.
 |
 | The signed payload is the issue time, a nonce, a hash of the address and the
 | honeypot's name. Nothing in it is secret — an address hash is not an address
 | — so it travels as plain text rather than encrypted; what the signature buys
 | is that none of it can be edited.
 |
 */
export function mint_form_token (
	ip_address: string,
	// Named rather than read straight from the clock, so that a test can mint
	// a token that is already old. `verify_form_token` takes the same
	// parameter for the same reason, and the pair of them is what lets the
	// timing check be exercised without a test that waits half an hour.
	issued_at = Date.now(),
): Minted | null {
	const secret = Environment.get( "REGISTRATION_TOKEN_SECRET" )

	if ( !secret ) {
		return null
	}

	const nonce = crypto.randomBytes( 16 ).toString( "hex" )
	const ip_hash = hash_address( secret, ip_address )
	const honeypot = honeypot_name( secret, issued_at )

	const payload = [ VERSION, issued_at, nonce, ip_hash, honeypot ].join( "." )

	return {
		honeypot,
		token: `${payload}.${sign( secret, payload )}`,
	}
}

/**
 |
 | Verify, and spend.
 |
 | The order matters: the signature is checked before anything is read out of
 | the token as though it meant something, and the nonce is recorded **last**,
 | only once every other check has passed. A token refused for being too fast
 | is not spent, so the same visitor slowing down and pressing again succeeds.
 |
 | ─── THE IP CHECK IS SOFT ───────────────────────────────────────────────────
 |
 | A mismatch is reported to the caller and the token still verifies. This was
 | the open call on this ticket and it went this way for a plain reason: a hard
 | check turns away real people whose address changes between opening the form
 | and pressing the button — a phone handing over between masts, a VPN
 | reconnecting, a corporate egress pool — and what they see is a failure they
 | can neither diagnose nor work around. Against a bot the check buys little:
 | anything rotating addresses mid-flow is already fetching a fresh token per
 | submission, which the binding cannot see and the rate limiter can.
 |
 | Everything the token was really for survives: it still proves the form was
 | served here, still supplies the timing check, still carries the honeypot
 | name, and the nonce still makes it single use.
 |
 */
export function verify_form_token (
	token: string,
	ip_address: string,
	now = Date.now(),
): Verified {
	const secret = Environment.get( "REGISTRATION_TOKEN_SECRET" )

	if ( !secret ) {
		return { ok: false, reason: "unconfigured" }
	}

	const parts = token.split( "." )

	if ( parts.length !== 6 || parts[0] !== VERSION ) {
		return { ok: false, reason: "malformed" }
	}

	const [ , issued_at_raw, , ip_hash, honeypot, signature ] = parts
	const payload = parts.slice( 0, 5 ).join( "." )

	if ( !signatures_match( sign( secret, payload ), signature ) ) {
		return { ok: false, reason: "bad-signature" }
	}

	const issued_at = Number( issued_at_raw )

	if ( !Number.isFinite( issued_at ) ) {
		return { ok: false, reason: "malformed" }
	}

	const age = now - issued_at

	// A negative age is a token from the future, which means a clock moved.
	// Treated as expired rather than as its own case: the visitor's remedy is
	// the same either way, and it is reopening the form.
	if ( age > OLDEST_MS || age < -OLDEST_MS ) {
		return { ok: false, reason: "expired" }
	}

	if ( age < YOUNGEST_MS ) {
		return { ok: false, reason: "too-fast" }
	}

	if ( !spend( token, now ) ) {
		return { ok: false, reason: "already-used" }
	}

	return {
		address_changed: ip_hash !== hash_address( secret, ip_address ),
		honeypot,
		ok: true,
	}
}

/**
 |
 | The honeypot's field name, derived from the secret and the day.
 |
 | Deterministic within a day and unguessable without the secret, so a bot
 | cannot learn the name once and skip it thereafter — and so nothing has to be
 | stored to know what was issued.
 |
 | The verifier reads the name out of the signed token rather than recomputing
 | it, which is what keeps a form opened at ten to midnight from breaking when
 | it is submitted at ten past.
 |
 */
function honeypot_name ( secret: string, at: number ) {
	const day = new Date( at ).toISOString().slice( 0, 10 )
	const digest = crypto.createHmac( "sha256", secret )
		.update( `honeypot.${day}` )
		.digest()

	return HONEYPOT_NAMES[digest[0] % HONEYPOT_NAMES.length]
}

function sign ( secret: string, payload: string ) {
	return crypto.createHmac( "sha256", secret ).update( payload )
		.digest( "hex" )
}

function hash_address ( secret: string, ip_address: string ) {
	return crypto.createHmac( "sha256", secret )
		.update( `address.${ip_address}` )
		.digest( "hex" )
		.slice( 0, 16 )
}

/**
 |
 | Constant time, and length-guarded because `timingSafeEqual` throws on
 | buffers of different lengths rather than answering false.
 |
 */
function signatures_match ( expected: string, given: string ) {
	if ( expected.length !== given.length ) {
		return false
	}

	return crypto.timingSafeEqual(
		Buffer.from( expected ),
		Buffer.from( given ),
	)
}

/* _____
 | The spent-token set.
 |
 | Bounded twice over. Entries expire on their own — a token older than
 | `OLDEST_MS` is refused by the age check anyway, so remembering it beyond
 | that buys nothing — and the map is capped, so a flood cannot grow it without
 | limit. Eviction is oldest-first, which is the right order: the oldest
 | entries are the ones closest to being refused on age regardless.
 |
 | Swept on write rather than on a timer, so an idle process holds no interval.
 */

const MOST_SPENT_TOKENS_HELD = 20_000

const spent = new Map<string, number>()

function spend ( token: string, now: number ): boolean {
	sweep( now )

	if ( spent.has( token ) ) {
		return false
	}

	if ( spent.size >= MOST_SPENT_TOKENS_HELD ) {
		// Insertion order, so the first key is the oldest.
		const oldest = spent.keys().next()

		if ( !oldest.done ) {
			spent.delete( oldest.value )
		}
	}

	spent.set( token, now + OLDEST_MS )

	return true
}

function sweep ( now: number ) {
	for ( const [ token, expires_at ] of spent ) {
		// Insertion order is expiry order, because every entry gets the same
		// lifetime — so the first entry that has not expired means none after
		// it has either.
		if ( expires_at > now ) {
			return
		}

		spent.delete( token )
	}
}

/** For the tests, which need a process that has not seen their token before. */
export function forget_spent_tokens () {
	spent.clear()
}
