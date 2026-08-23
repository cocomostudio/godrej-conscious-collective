
import {
	Links,
	Meta,
	Scripts,
	ScrollRestoration,
} from "react-router"

import { Injected_Code } from "#web/cms/injected-code.tsx"

/**
 |
 | The root layout: the `<html />`, `<head />` and `<body />` of every page.
 |
 | The three `Injected_Code` mounts are the page shell's HTML document hooks,
 | each rendering the region named after the point it sits at. Nothing is
 | injected unless a page shell says so, and what it says arrives through the
 | ordinary block renderer.
 |
 */

export function RootLayout ( { children }: { children: React.ReactNode } ) {
	return <html lang="en" className="h-full">
		<head>
			<meta charSet="utf-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1" />
			<Meta />
			<Links />
			<Injected_Code at="before_head_closing" />
		</head>
		<body className="h-full font-sans">
			<Injected_Code at="after_body_opening" />
			{ children }
			<ScrollRestoration />
			<Scripts />
			<Injected_Code at="before_body_closing" />
		</body>
	</html>
}
