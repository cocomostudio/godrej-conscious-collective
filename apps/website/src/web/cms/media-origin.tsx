
/**
 |
 | Where a picture the CMS stores is served from.
 |
 | Strapi's own upload provider writes a relative path — `/uploads/…` — and the
 | website is a different origin, so something has to put the CMS's back in
 | front of it. That origin is server-side configuration, which the browser
 | cannot read, so the loader passes it down and every block asks for it here.
 |
 | A context rather than a prop threaded through the tree, for the same reason
 | the anchors are one: everything below the root arrives ready to walk, and a
 | picture can turn up at any depth.
 |
 */

import {
	type ReactNode,
	createContext,
	use,
} from "react"

const Media_Origin_Context = createContext<string>( "" )

export function Media_Origin (
	{ children, origin }: { children: ReactNode; origin: string },
) {
	return <Media_Origin_Context value={ origin }>
		{ children }
	</Media_Origin_Context>
}

export function use_media_origin () {
	return use( Media_Origin_Context )
}
