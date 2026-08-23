
/**
 |
 | A link an editor typed.
 |
 | The static site's navigation was a literal array in the source, so every
 | entry was known to be a route and every one of them was a `<Link>`. Nothing
 | an editor types is: the seeded footer already carries a `mailto:`, and a
 | carousel's slides point at Instagram.
 |
 | So anything that is not a site-relative path renders as a plain anchor.
 | Handing a `mailto:` or an absolute URL to the router's `<Link>` asks it to
 | resolve a pathname out of something that has none.
 |
 | Every other prop is passed straight through, so this can stand in for an
 | anchor anywhere one is expected — including as a `Button`'s render target,
 | where the button merges its own props onto whatever it was given.
 |
 */

import type { ComponentProps } from "react"

import { Link } from "react-router"

/**
 |
 | The props are borrowed from `<Link>` rather than written out, and `children`
 | is the reason. React Router resolves `@types/react` for itself, and in this
 | workspace that lands on the copy the CMS pins rather than the one the website
 | does — so a `ReactNode` from here is not assignable to a `ReactNode` from
 | there, and the error names a type against itself. Taking the whole prop type
 | from the component being wrapped sidesteps the question entirely.
 |
 */
type Nav_Link_Props = Omit<ComponentProps<typeof Link>, "to"> & {
	url: string
}

export function Nav_Link ( { url, ...props }: Nav_Link_Props ) {
	if ( url.startsWith( "/" ) || url.startsWith( "#" ) ) {
		return <Link to={ url } { ...props } />
	}

	return <a href={ url } { ...props as ComponentProps<"a"> } />
}
