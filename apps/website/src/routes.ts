
import type { RouteConfig } from "@react-router/dev/routes"

import {
	index,
	layout,
	route,
} from "@react-router/dev/routes"

/**
 |
 | One route module for the whole site.
 |
 | An editor decides what exists and where it lives, so the website cannot know
 | the route table at build time. The splat catches every path and the CMS
 | resolves it through the alias table.
 |
 | The splat needs an index route beside it, pointing at the same module: `*`
 | does **not** match the root path, so `/` would otherwise match nothing at all
 | and render an empty document — no error, no 404, no loader call. Both entries
 | are the same module, so they need explicit and distinct ids.
 |
 */

export default [
	layout( "infra/lib/ui/app-shells/primary/layout.tsx", {
		id: "primary-layout",
	}, [
		index( "web/cms/cms-page.route.tsx", { id: "cms-page-root" } ),
		route( "*", "web/cms/cms-page.route.tsx", { id: "cms-page" } ),
	] ),
] satisfies RouteConfig
