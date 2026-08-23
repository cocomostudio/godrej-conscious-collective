
/**
 |
 | The root block: a sidebar and a main column.
 |
 | It is the one block the website assembles rather than receives, and it
 | declares two regions, so the renderer hands each of them in as a prop named
 | after the attribute.
 |
 | Three arrangements exist in the rendered result — one column, two columns,
 | and the contributor arrangement — and an editor chooses between the first
 | two. **A one-column page renders none of the sidebar**: not a narrower one,
 | none of it.
 |
 | The site header and footer are the main event's, and arrive with it.
 |
 */

import type { ReactNode } from "react"

import type { Page_Layout } from "../envelope.ts"

import { ONE_COLUMN } from "../assemble-root.ts"

import {
	H,
	Level,
} from "#infra/lib/ui/react/headings.tsx"

type Root_Props = {
	page_layout: Page_Layout
	title: string
	standfirst?: string | null
	back_link: ReactNode
	sidebar: ReactNode
	main: ReactNode
}

export function Root (
	{ back_link, main, page_layout, sidebar, standfirst, title }: Root_Props,
) {
	const two_column = page_layout !== ONE_COLUMN

	return <div className="h-full bg-white">
		<div className="min-h-full flex flex-col bg-black">
			<main className="grow md:flex">
				{ two_column && <Sidebar
					back_link={ back_link }
					standfirst={ standfirst }
					title={ title }>
					{ sidebar }
				</Sidebar> }

				<Main_Column
					standfirst={ two_column ? null : standfirst }
					title={ two_column ? null : title }
					two_column={ two_column }>
					{ main }
				</Main_Column>
			</main>
		</div>
	</div>
}

/**
 |
 | The narrow first column. Sticky, so the back link and the table of contents
 | stay with the reader down a long page.
 |
 | The back link comes first, then the page's title, then everything the content
 | type and the components contributed. The title is the document's first
 | heading — the sidebar sits outside the main column's nesting, so it comes out
 | as the `h1` — and everything after it is one level down.
 |
 */
function Sidebar (
	{ back_link, children, standfirst, title }: {
		back_link: ReactNode
		children: ReactNode
		standfirst?: string | null
		title: string
	},
) {
	return <div className="layout__1-4__col-1 md:pl-1ccm pb-6 bg-gray-light">
		<div className="cc mx-auto sticky top-0 flex flex-col items-start gap-6 pt-6 md:pt-8 md:pb-6">
			{ back_link }

			<div>
				<H className="text-h2 md:font-semibold text-theme">
					{ title }
				</H>

				{ standfirst
					&& <p className="mt-4 text-p text-black">
						{ standfirst }
					</p> }
			</div>

			<Level>{ children }</Level>
		</div>
	</div>
}

/**
 |
 | Everything below here nests its own headings, so the level starts once, here,
 | and every heading's rank follows from where it sits rather than from what an
 | editor picked.
 |
 | A one-column page has no sidebar to carry its title, so the title comes here
 | instead. It has to go somewhere: the sidebar is where a two-column page shows
 | it, but "no sidebar" is a rule about the back link, the table of contents and
 | the side region — not licence for a page to lose its own name and start its
 | document at `h2` with no `h1` above it.
 |
 */
function Main_Column (
	{ children, standfirst, title, two_column }: {
		children: ReactNode
		standfirst?: string | null
		title?: string | null
		two_column: boolean
	},
) {
	return <div
		className={ two_column
			? "layout__1-4__col-2 bg-white"
			: "w-full bg-white" }>
		<div className="md:w-9c py-8 md:py-16 text-black">
			<div className="cc mx-auto md:px-16">
				{ title && <div className="pb-6 md:pb-8">
					<H className="text-h2 md:font-semibold text-theme">
						{ title }
					</H>

					{ standfirst
						&& <p className="mt-4 text-p text-black">
							{ standfirst }
						</p> }
				</div> }

				<Level>{ children }</Level>
			</div>
		</div>
	</div>
}
