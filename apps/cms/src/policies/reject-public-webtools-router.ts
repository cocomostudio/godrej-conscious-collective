
/**
 |
 | Reject public requests to webtools' own resolver route.
 |
 | `documents.strictParams` is off — see decision record 00004 — so a caller who
 | can reach `GET /api/webtools/router?path=…` can hand arbitrary root-level
 | params through to the document service. The frontend never uses that route: it
 | reads its own populate route in this application instead. So the route is
 | closed to anonymous callers, and that closure is what replaces the protection
 | `documents.strictParams` would have given.
 |
 | "Public" means the users-permissions Public role, which authenticates with
 | `credentials: null`. An API token or a signed-in user still gets through, so
 | an operator debugging with a token is not locked out.
 |
 */

export default function reject_public_webtools_router ( policy_context ) {
	const auth = policy_context.state?.auth

	return Boolean( auth?.credentials )
}
