
import {
	lazy,
	Suspense,
} from "react"
import {
	Outlet,
} from "react-router"

import type { Route } from "./+types/layout.ts"

import stylesheet from "./tailwind-v3/index.css?url"

/**
 |
 | The design inspector, and the whole of how it is kept out of production.
 |
 | The guard sits around the `lazy` call rather than around the element below,
 | so that a production build has no reference to the module left to bundle:
 | `import.meta.env.DEV` is replaced with `false` at build time, the ternary
 | folds to `null`, and the dynamic import inside the dead branch goes with it.
 | No chunk is emitted, and nothing is fetched. In development it is still
 | lazy — the overlay is a developer's tool and should not sit in the bundle
 | every page load pays for.
 |
 */
const Design_Inspector = import.meta.env.DEV
	? lazy( () => import( "#infra/browser/devops/design-inspector.tsx" ) )
	: null

export const links: Route.LinksFunction = () => [
	{
		rel: "stylesheet",
		href: stylesheet,
	},
]

export default function PrimaryLayout () {
	return <>
		<Favicons />
		<Outlet />

		{ Design_Inspector && <Suspense fallback={ null }>
			<Design_Inspector />
		</Suspense> }
	</>
	// ↑ No wrapper element. The page's own root block owns the outermost
	// 	element, because that is where the resolved event's colour variables
	// 	are set, and those vary per page.
}

function Favicons () {
	return <link rel="icon" href="data:;base64,=" />
}
