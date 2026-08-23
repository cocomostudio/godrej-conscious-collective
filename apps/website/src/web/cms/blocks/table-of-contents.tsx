
/**
 |
 | The table of contents: flat, in document order, holding only what opted in.
 |
 | It is a content-type contribution, so it sits above the side region and below
 | the back link. It renders on a Page and nowhere else, because it is fed by a
 | top-level `toc` attribute and no other content type has one.
 |
 */

import { Link } from "react-router"

import type { Toc_Entry } from "../table-of-contents.ts"

export function Table_Of_Contents ( { entries }: { entries: Toc_Entry[] } ) {
	if ( entries.length === 0 ) {
		return null
	}

	return <nav aria-label="On this page" className="w-full">
		<ul className="grid gap-x-4 *-but-last:border-b border-black/10 *:*:py-4">
			{ entries.map( ( entry ) => (
				<li key={ entry.anchor }>
					<Link
						className="flex items-center gap-2 hover:text-theme transition-colors"
						to={ `#${entry.anchor}` }>
						<span className="text-small font-medium">
							{ entry.label }
						</span>
					</Link>
				</li>
			) ) }
		</ul>
	</nav>
}
