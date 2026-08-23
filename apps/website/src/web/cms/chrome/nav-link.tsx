
/**
 |
 | A link an editor typed.
 |
 | The static site's navigation was a literal array in the source, so every
 | entry was known to be a route and every one of them was a `<Link>`. A page
 | shell's navigation is not: the seeded footer already carries a `mailto:`, and
 | the header will carry links off the site as soon as someone needs one.
 |
 | So anything that is not a site-relative path renders as a plain anchor.
 | Handing a `mailto:` or an absolute URL to the router's `<Link>` asks it to
 | resolve a pathname out of something that has none.
 |
 */

import type { ComponentProps } from "react"

import { Link } from "react-router"

/**
 |
 | `children` is borrowed from `<Link>` rather than typed as `ReactNode`.
 |
 | React Router resolves `@types/react` for itself, and in this workspace that
 | lands on the copy the CMS pins rather than the one the website does. The two
 | `ReactNode`s are structurally different — React 19's admits `bigint` — so a
 | `ReactNode` from here is not assignable to a `ReactNode` from there, and the
 | error names a type against itself. Taking the type from the component being
 | handed the children sidesteps the question entirely.
 |
 */
type Nav_Link_Props = {
	url: string
	className?: string
	tabIndex?: number
	onClick?: () => void
	children: ComponentProps<typeof Link>["children"]
}

export function Nav_Link ( { children, url, ...props }: Nav_Link_Props ) {
	if ( url.startsWith( "/" ) ) {
		return <Link to={ url } { ...props }>{ children }</Link>
	}

	return <a href={ url } { ...props }>{ children }</a>
}
