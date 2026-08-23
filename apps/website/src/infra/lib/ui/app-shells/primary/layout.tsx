
import {
	Outlet,
} from "react-router"

import type { Route } from "./+types/layout.ts"

import stylesheet from "./tailwind-v3/index.css?url"

export const links: Route.LinksFunction = () => [
	{
		rel: "stylesheet",
		href: stylesheet,
	},
]

export default function PrimaryLayout () {
	return <>
		<Favicons />
		<div className="h-full bg-white">
			<Outlet />
		</div>
	</>
}

function Favicons () {
	return <link rel="icon" href="data:;base64,=" />
}
