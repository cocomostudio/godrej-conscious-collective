
/**
 |
 | Attaches `global::reject-public-webtools-router` to webtools' resolver route.
 |
 | The route is located by its handler rather than by its position, and a
 | failure to find it throws. A webtools upgrade that renames or moves the route
 | must not silently drop the policy — and the remedy is this file, in this
 | repository, so failing loudly is the right call.
 |
 */

const RESOLVER_HANDLER = "core.router"
const POLICY = "global::reject-public-webtools-router"

export default function extend_webtools ( plugin ) {
	const routes = plugin.routes?.["content-api"]?.routes ?? []
	const resolver_route = routes.find( ( route ) =>
		route.handler === RESOLVER_HANDLER
	)

	if ( !resolver_route ) {
		throw new Error(
			`Could not find webtools' resolver route (handler "${RESOLVER_HANDLER}") `
				+ `to attach "${POLICY}" to. The route has moved or been renamed; `
				+ `re-point this extension at it before booting.`,
		)
	}

	resolver_route.config = resolver_route.config ?? {}
	resolver_route.config.policies = [
		...( resolver_route.config.policies ?? [] ),
		POLICY,
	]

	return plugin
}
