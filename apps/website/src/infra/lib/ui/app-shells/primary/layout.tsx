
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
		<Outlet />
	</>
	// ↑ No wrapper element. The page's own root block owns the outermost
	// 	element, because that is where the resolved event's colour variables
	// 	are set, and those vary per page.
}

function Favicons () {
	return <link rel="icon" href="data:;base64,=" />
}
