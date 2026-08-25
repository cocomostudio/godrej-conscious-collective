
/**
 |
 | What the two registration routes answer with, in one place.
 |
 | Both are JSON, both refuse a caller who has had too many turns, and both must
 | never be cached. Spelled twice they would drift — and the one most likely to
 | drift is `no-store`, which is not decoration on either route: an intermediary
 | that cached the mint would hand one token to everybody it served, and one
 | that cached a submission's answer would tell the next visitor their
 | registration had already gone through.
 |
 */

const HEADERS = {
	"cache-control": "no-store",
	"content-type": "application/json",
}

export function answer (
	body: unknown,
	status: number,
	headers: HeadersInit = {},
) {
	return new Response( JSON.stringify( body ), {
		headers: { ...HEADERS, ...headers },
		status,
	} )
}

/**
 |
 | The rate limiter's answer, with the one header that makes it actionable.
 |
 | `Retry-After` is what turns "no" into "not yet": a caller told how long to
 | wait can wait, and one told nothing can only guess or give up. The number is
 | the limiter's own — when the oldest attempt in the offending window falls out
 | of it — rather than a round figure.
 |
 */
export function too_many_attempts (
	retry_after_seconds: number,
	message: string,
) {
	return answer(
		{ message },
		429,
		{ "retry-after": String( retry_after_seconds ) },
	)
}
