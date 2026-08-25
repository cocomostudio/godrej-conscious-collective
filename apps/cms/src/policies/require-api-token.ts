
/**
 |
 | Refuse anyone who is not carrying an API token.
 |
 | The registration relay holds a token scoped to creating a Lead and nothing
 | else, and that token lives on the website's server — it never reaches a
 | browser. This policy is what makes holding it the requirement rather than a
 | convention: an anonymous caller who found `POST /api/leads` is turned away
 | here, before the controller runs, whatever the Public role happens to hold.
 |
 | "Anonymous" means the users-permissions Public role, which authenticates with
 | `credentials: null`. An API token or a signed-in user still gets through, so
 | an operator debugging with a token is not locked out.
 |
 | ─── WHAT THIS DOES *NOT* CHECK, AND WHY THE NAME SAYS SO ───────────────────
 |
 | **The scope.** It was called `require-scoped-token` and that name was a
 | promise it does not keep: a full-access token passes this, and so does any
 | signed-in user whose role holds `api::lead.lead.create`. What narrows a
 | caller to *create a Lead and nothing else* is Strapi's own permission check,
 | which runs immediately after this one and against the token's own
 | permissions — and that check is where the relay's token being scoped
 | actually bites.
 |
 | So this is the presence half of a two-part gate, and it is named for the half
 | it is. A policy whose name over-promises is worse than no policy, because the
 | next person to read the route believes the scoping is here and stops looking.
 |
 | The gate is worth having on its own terms: without it, enabling
 | `api::lead.lead.create` for the Public role — one tick, while granting
 | something else — would open the endpoint to anonymous callers.
 |
 | Deliberately **not** an `Origin` check. A browser sets that header honestly
 | and anything that is not a browser sets whatever it likes, so a rule built on
 | it turns away the honest caller and waves the other one through.
 |
 */

export default function require_api_token ( policy_context ) {
	const auth = policy_context.state?.auth

	return Boolean( auth?.credentials )
}
