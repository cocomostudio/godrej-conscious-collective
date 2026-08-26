
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
	/**
	 |
	 | The registration form's two resource routes — no component, no markup,
	 | JSON both ways.
	 |
	 | **Outside the layout**, and ahead of the splat. Outside because there is
	 | nothing to lay out: they would otherwise load the site's stylesheet and
	 | run the layout's own module for a response that is a few hundred bytes
	 | of JSON. Ahead of it because `*` matches everything, these paths
	 | included, and the first match wins.
	 |
	 | The form itself is **not** a route. It is an overlay opened by Register
	 | Now and portaled through the slot-and-fill tunnel, so that a visitor can
	 | register from wherever they happen to be rather than being sent
	 | somewhere to do it.
	 |
	 */
	route( "registration/token", "web/cms/registration/token.route.ts" ),
	route( "registration", "web/cms/registration/submit.route.ts" ),

	/**
	 |
	 | Add to Calendar's own resource route, out here for the same two reasons:
	 | there is nothing to lay out around an iCalendar document, and `*` would
	 | otherwise match it first and try to resolve `/calendar.ics` as a page.
	 |
	 */
	route( "calendar.ics", "web/cms/calendar.route.ts" ),

	layout( "infra/lib/ui/app-shells/primary/layout.tsx", {
		id: "primary-layout",
	}, [
		index( "web/cms/cms-page.route.tsx", { id: "cms-page-root" } ),
		route( "*", "web/cms/cms-page.route.tsx", { id: "cms-page" } ),
	] ),
] satisfies RouteConfig
