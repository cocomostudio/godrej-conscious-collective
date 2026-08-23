
/**
 |
 | Content API.
 |
 | `rest.strictParams` is **on**: an unknown query parameter on a REST request is
 | rejected rather than ignored.
 |
 | `documents.strictParams` is **off**, in every environment. That is a
 | deliberate reversal — see decision record 00004. Turning it on kills webtools'
 | Content-Manager side panel, which is the only place an editor can override a
 | URL. The protection it would have given is replaced by a policy that rejects
 | public requests to webtools' own resolver route, which the frontend never
 | uses.
 |
 */

export default {
	rest: {
		defaultLimit: 25,
		maxLimit: 100,
		withCount: true,
		strictParams: true,
	},
	documents: {
		strictParams: false,
	},
}
