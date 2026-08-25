
/**
 |
 | Lead's router, and the first of the three layers protecting a registrant's
 | name, email address and phone number.
 |
 | **The default route set is not used.** `factories.createCoreRouter` composes
 | find, findOne, create, update and delete; this file declares create and
 | nothing else.
 |
 | That is not merely a narrower surface. The permission grid is **derived from
 | routes** — a symbol is stamped onto a controller method only when a route
 | composes onto it, and the action enumeration filters on exactly that symbol —
 | so with no read route there is no `api::lead.lead.find` action, no checkbox
 | for it in the Public role's edit page, and no way for anyone to grant one by
 | accident while granting something else. The read path answers 404 regardless
 | of what any role holds, because there is nothing there to answer.
 |
 | Verified in 5.52.1 source.
 |
 | The second layer is the policy below. The third is the boot-time repair in
 | `src/this/lead/prune-public-lead-permissions.ts`, which exists because
 | permission pruning uses the controller's keys rather than the routes — so a
 | row stored before this route set existed survives, and renders **ticked**.
 |
 */

export default {
	type: "content-api",
	routes: [
		{
			method: "POST",
			path: "/leads",
			handler: "lead.create",
			config: {
				policies: [ "global::require-api-token" ],
			},
		},
	],
}
