
/**
 |
 | The page shell's injected code, put where it was asked to go.
 |
 | The HTML document hooks component holds three regions and each belongs at a
 | different point of the document, so this mounts the block once per point and
 | tells it which of its three to emit. Everything below is walked by the
 | ordinary renderer, through the ordinary registry — a script is a block like
 | any other.
 |
 | The document's layout wraps every page, including the error boundary and the
 | pages that never reached a loader, so the shell is read defensively: no
 | envelope means no injected code, not a failure.
 |
 */

import { useMatches } from "react-router"

import type { Hook_Position } from "./blocks/html-document-hooks.tsx"

import { HTML_DOCUMENT_HOOKS } from "./blocks/html-document-hooks.tsx"
import { render_block } from "./render-block.tsx"

export function Injected_Code ( { at }: { at: Hook_Position } ) {
	const hooks = use_injected_code()

	if ( !hooks ) {
		return null
	}

	return render_block( {
		...hooks,
		__component: HTML_DOCUMENT_HOOKS,
		position: at,
	} )
}

/**
 |
 | Whichever route matched carries the page shell's hooks in its loader data.
 | There are two route ids behind one module — the splat does not match the root
 | path — so the data is found by shape rather than by naming either.
 |
 | The key is `loaderData` and not `data`: React Router 8 renamed it on
 | `useMatches()`\u2019 results, and the old name reads as `undefined` rather than
 | as an error — which here would have meant a page shell\u2019s injected code
 | silently never running.
 |
 */
function use_injected_code () {
	for ( const match of useMatches() ) {
		const injected_code =
			( match as { loaderData?: { injected_code?: unknown } } )
				.loaderData?.injected_code

		if ( injected_code && typeof injected_code === "object" ) {
			return injected_code as Record<string, unknown>
		}
	}

	return null
}
