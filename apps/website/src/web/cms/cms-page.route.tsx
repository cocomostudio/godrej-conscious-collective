
/**
 |
 | Every page on the site.
 |
 | One route, one loader, one request to the CMS. Which content type answered is
 | the envelope's business; this route asks for a path and renders whatever came
 | back.
 |
 | **The root path.** No content type carries a slug attribute — webtools'
 | pattern interpolates the Page's title, so a Page titled "Home" resolves to
 | `/home`. A pattern of `/` would be legal but identical for every Page, and
 | the alias path column has no unique constraint, so the second Page would
 | silently become `/-0`. So the incoming path is tried as it arrives, and
 | `/home` is tried only when `/` resolves to nothing. `/home` itself redirects
 | permanently to `/`, so there is one address for one page.
 |
 | Both environments behave identically from outside, and neither depends on
 | whether the database happens to hold a manual override — which in production
 | it will, once an author sets one.
 |
 */

import type { Route } from "./+types/cms-page.route.ts"

import {
	data,
	isRouteErrorResponse,
	Link,
	redirect,
} from "react-router"

import { Anchors } from "./anchors.tsx"
import { assemble_root } from "./assemble-root.ts"
import { render_block } from "./render-block.tsx"
import { fetch_envelope } from "./fetch-envelope.server.ts"

const HOME_PATH = "/home"

export async function loader ( { params, request }: Route.LoaderArgs ) {
	const pathname = "/" + ( params["*"] ?? "" )

	if ( pathname === HOME_PATH ) {
		throw redirect( "/", 301 )
	}

	const status = new URL( request.url ).searchParams.get( "status" )

	let fetched = await fetch_envelope( pathname, { status } )

	if ( !fetched.found && pathname === "/" ) {
		fetched = await fetch_envelope( HOME_PATH, { status } )
	}

	if ( !fetched.found ) {
		throw data( { pathname }, 404 )
	}

	const { entry, page_shell } = fetched.envelope
	const { root, table_of_contents } = assemble_root( fetched.envelope )

	return {
		anchors: table_of_contents.anchors,
		root,
		site_title: page_shell?.site_title ?? null,
		title: entry.title,
	}
}

export function meta ( { loaderData }: Route.MetaArgs ) {
	const title = loaderData?.site_title
		? `${loaderData.title} — ${loaderData.site_title}`
		: loaderData?.title

	return [ { title } ]
}

export default function Cms_Page ( { loaderData }: Route.ComponentProps ) {
	return <Anchors anchors={ loaderData.anchors }>
		{ render_block( loaderData.root ) }
	</Anchors>
}

export function ErrorBoundary ( { error }: Route.ErrorBoundaryProps ) {
	const not_found = isRouteErrorResponse( error ) && error.status === 404

	return <main className="cc mx-auto py-16">
		<h1 className="text-h1 text-black">
			{ not_found ? "Page not found" : "Something went wrong" }
		</h1>
		<p className="mt-4 text-p text-black">
			{ not_found
				? "The page you asked for is not here."
				: "Please come back later." }
		</p>
		<Link className="mt-6 inline-block text-p text-theme underline" to="/">
			Go back
		</Link>
	</main>
}
