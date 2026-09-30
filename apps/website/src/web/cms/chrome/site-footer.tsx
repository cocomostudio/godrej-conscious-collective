
/**
 |
 | The site footer, lifted from the static site.
 |
 | The secondary navigation and the social links come from the page shell, and
 | the date line comes from the **main event**. The copyright line is still a
 | literal, because no attribute holds it.
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

import { text_color_class } from "../blocks/text-color.ts"
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
 | The four social accounts, in the order the footer draws them, each with the
 | page shell attribute that holds its URL.
 |
 */
const SOCIAL_ACCOUNTS = [
	{ Logo: Instagram_Logo, attribute: "instagram_url" },
	{ Logo: Facebook_Logo, attribute: "facebook_url" },
	{ Logo: LinkedIn_Logo, attribute: "linkedin_url" },
	{ Logo: YouTube_Logo, attribute: "youtube_url" },
] as const

/**
 |
 | The accounts the page shell names. **An account with no URL has no icon**,
 | because an icon that leads nowhere is worse than no icon at all.
 |
 */
function social_links_of ( page_shell: Page_Shell | null ) {
	return SOCIAL_ACCOUNTS.flatMap( ( { Logo, attribute } ) => {
		const url = page_shell?.[attribute]?.trim()

		return url ? [ { Logo, url } ] : []
	} )
}

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
	const social_links = social_links_of( page_shell )

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
					links={ links }
					social_links={ social_links } />
			</div>
		</div>

		<div className="cc mx-auto">
			<Legal_And_Social
				className="max-md:hidden lg:hidden mt-12 flex justify-between items-end"
				links={ links }
				social_links={ social_links } />
		</div>
	</footer>
}

function Legal_And_Social (
	{ className = "", links, social_links }: {
		className?: string
		links: Navigation_Link[]
		social_links: ReturnType<typeof social_links_of>
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
								className={ `underline underline-offset-2 ${text_color_class( link.text_color, "white" )}` }>
								{ link.label }
							</Nav_Link>
						</li>
					) }
				</ul>
			</nav>
		</div>

		{
			/* A new tab, so that a visitor following the festival's account
			   does not lose their place on the festival's site. */
		}
		{ social_links.length > 0
			&& <nav className="mt-8 md:m-0" aria-label="Social media">
				<ul className="flex gap-8 *:hover:opacity-100 *:transition-opacity *:ease-in-out *:duration-500">
					{ social_links.map( ( { Logo, url } ) =>
						<li key={ url }>
							<a
								href={ url }
								rel="noopener noreferrer"
								target="_blank">
								<Logo />
							</a>
						</li>
					) }
				</ul>
			</nav> }
	</div>
}
