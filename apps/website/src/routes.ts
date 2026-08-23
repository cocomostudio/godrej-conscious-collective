
import type { RouteConfig } from "@react-router/dev/routes"

import {
	index,
	layout,
} from "@react-router/dev/routes"

export default [
	layout( "infra/lib/ui/app-shells/primary/layout.tsx", {
		id: "primary-layout",
	}, [
		index( "web/home/home.route.tsx" ),
	] ),
] satisfies RouteConfig
