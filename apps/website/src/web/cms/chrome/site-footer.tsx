
/**
 |
 | The site footer, lifted from the static site.
 |
 | Same two changes as the header: the secondary navigation comes from the page
 | shell rather than from literals in the source, and the date line comes from
 | the **main event**. The social links and the copyright line are still
 | literals — no attribute holds them, and the spec's Page Shell does not name
 | any.
 |
 | The footer's own navigation is capped at three by the schema. It is the
 | fine-print row beside the copyright, not a second site menu.
 |
 */

import type { Ref } from "react"

import { Link } from "react-router"

import type {
	Event,
	Link as Navigation_Link,
	Page_Shell,
} from "../envelope.ts"

import { Nav_Link } from "../nav-link.tsx"
import { When_And_Where } from "./when-and-where.tsx"

import { Conscious_Collective_Logo } from "#infra/lib/ui/react/logos/conscious-collective-logo.tsx"
import { Facebook_Logo } from "#infra/lib/ui/react/logos/facebook-logo.tsx"
import { Godrej_Design_Lab_Logo } from "#infra/lib/ui/react/logos/godrej-design-lab-logo.tsx"
import { Instagram_Logo } from "#infra/lib/ui/react/logos/instagram-logo.tsx"
import { LinkedIn_Logo } from "#infra/lib/ui/react/logos/linkedin-logo.tsx"
import { YouTube_Logo } from "#infra/lib/ui/react/logos/youtube-logo.tsx"

/**
 |
 | The social accounts, and the copyright line below, are literals: no attribute
 | holds either, and the spec's Page Shell names none. The URLs are the static
 | site's own **placeholders** and point at `example.com` — they were never real
 | and somebody has to replace them with the accounts the event actually has.
 |
 */
const SOCIAL_LINKS = [
	{ Logo: Instagram_Logo, url: "https://example.com/instagram" },
	{ Logo: Facebook_Logo, url: "https://example.com/facebook" },
	{ Logo: LinkedIn_Logo, url: "https://example.com/linkedin" },
	{ Logo: YouTube_Logo, url: "https://example.com/youtube" },
]

type Site_Footer_Props = {
	main_event: Event | null
	page_shell: Page_Shell | null
	/**
	 |
	 | Handed down so the sidebar's copy of <When_And_Where /> can watch this
	 | element and hide itself before the two are on screen together. Nothing
	 | else reads it, and the footer itself does nothing with it.
	 |
	 */
	ref?: Ref<HTMLElement>
}

export function Site_Footer (
	{ main_event, page_shell, ref }: Site_Footer_Props,
) {
	const links = page_shell?.navigation_footer ?? []

	// The footer is dark, on every page. The static site's own footer took a
	// colour scheme, but nothing in this build has ever wanted the light one,
	// so the choice is not offered until something asks for it.
	return <footer
		ref={ ref }
		className="grow-0 shrink-0 py-8 cs-dark bg-black text-white">
		<div className="cc mx-auto flex justify-between">
			<When_And_Where
				className="max-md:hidden max-w-68"
				event={ main_event } />

			<div>
				<div className="flex gap-4 md:gap-8 h-12 md:justify-end">
					<a href="https://www.godrejenterprises.com/">
						<Godrej_Design_Lab_Logo className="w-auto h-full" />
					</a>

					<hr className="w-px h-auto bg-current" />

					<Link to="/">
						<Conscious_Collective_Logo className="w-auto h-full" />
					</Link>
				</div>

				<Legal_And_Social
					className="md:max-lg:hidden md:mt-12 md:flex items-end gap-6"
					links={ links } />
			</div>
		</div>

		<div className="cc mx-auto">
			<Legal_And_Social
				className="max-md:hidden lg:hidden mt-12 flex justify-between items-end"
				links={ links } />
		</div>
	</footer>
}

function Legal_And_Social (
	{ className = "", links }: {
		className?: string
		links: Navigation_Link[]
	},
) {
	return <div className={ className }>
		<div className="mt-4 md:m-0 md:flex md:gap-1">
			<p className="text-small md:after:content-['·'] md:after:ml-1">
				Copyright © 2026
			</p>

			<nav aria-label="Secondary">
				<ul className="flex flex-wrap gap-y-0.75 md:gap-0 *:text-small *:after:content-['·'] *:after:inline *:after:px-2 [&>*:last-child]:after:hidden">
					{ links.map( ( link, index ) =>
						<li key={ `${link.url}:${index}` }>
							<Nav_Link
								url={ link.url }
								className="underline underline-offset-2">
								{ link.label }
							</Nav_Link>
						</li>
					) }
				</ul>
			</nav>
		</div>

		<nav className="mt-8 md:m-0" aria-label="Social media">
			<ul className="flex gap-8 *:hover:opacity-100 *:transition-opacity *:ease-in-out *:duration-500">
				{ SOCIAL_LINKS.map( ( { Logo, url } ) =>
					<li key={ url }>
						<a href={ url }>
							<Logo />
						</a>
					</li>
				) }
			</ul>
		</nav>
	</div>
}
