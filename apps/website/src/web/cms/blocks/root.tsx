
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
 | It also owns the page's outermost element, which is why the chrome and the
 | context colours are here rather than in a route layout. The header and the
 | footer follow the **main** event and are the same on every page of the site;
 | the colours follow the **resolved** event and are this page's own. Both need
 | to be outside the columns, and the colours need to be somewhere that can
 | differ from one page to the next.
 |
 */

import type {
	CSSProperties,
	ReactNode,
} from "react"

import type {
	Event,
	Page_Layout,
	Page_Shell,
} from "../envelope.ts"

import { ONE_COLUMN } from "../assemble-root.ts"
import {
	SCREEN,
	SIDEBAR,
} from "../channels.ts"
import { Site_Footer } from "../chrome/site-footer.tsx"
import { Site_Header } from "../chrome/site-header.tsx"
import {
	use_page_layout,
	use_page_title_class,
} from "../page-layout.tsx"

import {
	H,
	Level,
} from "#infra/lib/ui/react/headings.tsx"
import {
	Slot,
	Slot_Provider,
} from "#infra/lib/ui/react/slot-and-fill.tsx"

type Root_Props = {
	page_layout: Page_Layout
	/** Null on a content type whose masthead carries the name instead. */
	title: string | null
	standfirst?: string | null
	colours: Record<string, string>
	main_event: Event | null
	page_shell: Page_Shell | null
	back_link: ReactNode
	masthead: ReactNode
	sidebar: ReactNode
	/**
	 |
	 | **Whether the sidebar column exists below the medium breakpoint.**
	 |
	 | A Page's does: the design shows its back link and its table of contents
	 | on a phone, stacked above the content. A session's does not — the design
	 | puts the masthead first there and repeats the sidebar's contents
	 | underneath it, which is what `sidebar_repeat` carries.
	 |
	 */
	sidebar_at_every_width: boolean
	/**
	 |
	 | The sidebar again, for the main column, shown only below the medium
	 | breakpoint and only on a content type whose sidebar is hidden there.
	 |
	 | It is deliberately a second copy of the same blocks rather than one copy
	 | moved: the two sit in different places, wear different widths and, in the
	 | details list's case, lay out in a different number of columns. The static
	 | site does exactly this, and a single copy that moved would need the two
	 | positions to agree about everything except position.
	 |
	 */
	sidebar_repeat: ReactNode
	main: ReactNode
}

export function Root (
	{
		back_link,
		colours,
		main,
		main_event,
		masthead,
		page_layout,
		page_shell,
		sidebar,
		sidebar_at_every_width,
		sidebar_repeat,
		standfirst,
		title,
	}: Root_Props,
) {
	const two_column = page_layout !== ONE_COLUMN

	// Custom properties are not part of React's `CSSProperties`, and widening
	// the type is the whole of what the cast buys. The keys are this project's
	// own, produced one line away in `context-colours.ts`.
	//
	// **The tunnel's provider wraps the whole page**, because both of its
	// channels are on it: the screen channel here, above everything, and the
	// sidebar channel below. One provider per page, so nothing leaks between
	// two independently mounted trees.
	return <Slot_Provider>
		<div className="h-full bg-white" style={ colours as CSSProperties }>
			{
				/* Anything that has to escape the layout entirely — the
			     filtration drawer, and the registration overlay after it.
			     It sits outside the column flow and above the chrome, so
			     nothing sticky, scrolled or stacked can clip it. */
			}
			<Slot name={ SCREEN } />

			<div className="min-h-full flex flex-col bg-black">
				<Site_Header
					main_event={ main_event }
					page_shell={ page_shell } />

				<main className="grow md:flex">
					{ two_column && <Sidebar
						at_every_width={ sidebar_at_every_width }
						back_link={ back_link }
						standfirst={ standfirst }
						title={ title }>
						{ sidebar }
					</Sidebar> }

					<Main_Column
						masthead={ masthead }
						sidebar_repeat={ sidebar_repeat }
						title={ two_column ? null : title }
						two_column={ two_column }>
						{ main }
					</Main_Column>
				</main>

				<Site_Footer
					main_event={ main_event }
					page_shell={ page_shell } />
			</div>
		</div>
	</Slot_Provider>
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
 | **The content type always precedes the component**, and the slot at the
 | bottom is the whole of how that is enforced: what the content type
 | contributed is rendered above it as its sibling, and a component's
 | contribution can only arrive inside it. A listing's filtration widget is the
 | first thing to use it.
 |
 | A one-column page renders no sidebar at all, so there is no slot there — and
 | a widget with nowhere to go falls back to rendering where it stands, which
 | the tunnel answers on its own.
 |
 */
function Sidebar (
	{ at_every_width, back_link, children, standfirst, title }: {
		at_every_width: boolean
		back_link: ReactNode
		children: ReactNode
		standfirst?: string | null
		title: string | null
	},
) {
	return <div
		className={ `${
			at_every_width ? "" : "max-md:hidden "
		}layout__1-4__col-1 md:pl-1ccm pb-6 bg-gray-light` }>
		<div className="cc mx-auto sticky top-0 flex flex-col items-start pt-6 md:pt-8 md:pb-6">
			{ back_link }

			<div className="mt-4">
				<Page_Title standfirst={ standfirst } title={ title } />
			</div>

			<div className="mt-6">
				<Level>
					{ children }

					<Slot name={ SIDEBAR } />
				</Level>
			</div>
		</div>
	</div>
}

/**
 |
 | The page's own name, and the line under it.
 |
 | One component for the two places it can appear — the sidebar of a two-column
 | page, and the main column of a one-column page, which has no sidebar to put
 | it in. It is the same heading either way, and the two must not drift.
 |
 */
function Page_Title (
	{ standfirst, title }: {
		standfirst?: string | null
		title: string | null
	},
) {
	if ( !title ) {
		return null
	}

	const one_column = use_page_layout() === "one-column"

	// Standfirst is skipped on a one-column layout. See the standfirst
	// attribute's description on the Page and Session content types.
	const show_standfirst = !one_column && standfirst

	return <div>
		<H className={ use_page_title_class() }>{ title }</H>

		{ show_standfirst
			&& <p className="mt-4 text-p text-black">{ standfirst }</p> }
	</div>
}

/**
 |
 | Everything below here nests its own headings, so the level starts once, here,
 | and every heading's rank follows from where it sits rather than from what an
 | editor picked.
 |
 | **The masthead sits outside that**, above the column's own padding and above
 | the level it opens. It is full-bleed within the column, which the padded
 | container inside cannot be, and it carries the document's `h1`, which a
 | heading one level down could not be.
 |
 | A one-column page has no sidebar to carry its title, so the title comes here
 | instead. It has to go somewhere: the sidebar is where a two-column page shows
 | it, but "no sidebar" is a rule about the back link, the table of contents and
 | the side region — not licence for a page to lose its own name and start its
 | document at `h2` with no `h1` above it.
 |
 */
function Main_Column (
	{ children, masthead, sidebar_repeat, title, two_column }: {
		children: ReactNode
		masthead: ReactNode
		sidebar_repeat: ReactNode
		title?: string | null
		two_column: boolean
	},
) {
	return <div
		className={ two_column
			? "layout__1-4__col-2 bg-white"
			// A one-column page's sections run edge to edge, and the blocks
			// that have to run off those edges do it with margins measured
			// from `100vw`. Where a browser draws a classic scrollbar that is
			// a few pixels wider than the column actually is, so the overflow
			// is clipped rather than left to put a second scrollbar along the
			// bottom of every page.
			: "w-full overflow-x-hidden bg-white" }>
		{
			/* On mobile, the sidebar stacks above the main column and the two
		     were separated by a white strip of the main column's own top
		     padding. That padding is gone; this line takes its place so the
		     grey sidebar and whatever the main column opens with — a listing
		     header, a section — have a clear break between them rather than
		     one running straight into the other. Two-column pages that show
		     their sidebar on mobile are the ones that see it, which is what
		     `sidebar_repeat` being empty means. */
		}
		{ two_column && !has_blocks( sidebar_repeat )
			&& <div className="bg-gray-light">
				<hr className="md:hidden cc mx-auto border-black opacity-10" />
			</div> }

		{ masthead }

		{ has_blocks( sidebar_repeat )
			&& <div className="md:hidden cc mx-auto pt-8 flex flex-col items-start gap-6">
				{ sidebar_repeat }
			</div> }

		{ two_column
			? <div className="md:w-9c text-black">
				<div className="cc mx-auto md:pl-16">
					{ title && <div className="pb-6 md:pb-8">
						<Page_Title
							title={ title } />
					</div> }

					<Level>{ children }</Level>
				</div>
			</div>
			// Nothing wraps the blocks on a one-column page: each section is
			// full-width and brings its own padding and its own container.
			// Only the title needs either, because it sits above the first of
			// them rather than inside it.
			: <div className="text-black">
				{ title && <div className="cc mx-auto pt-8 md:pt-16">
					<Page_Title title={ title } />
				</div> }

				<Level>{ children }</Level>
			</div> }
	</div>
}

/**
 |
 | A region the renderer filled in comes back as an array, and an empty one is
 | still an array — so a wrapper hung on the node itself would render its own
 | padding around nothing on every page that contributed no blocks.
 |
 */
function has_blocks ( region: ReactNode ) {
	return Array.isArray( region ) && region.length > 0
}
