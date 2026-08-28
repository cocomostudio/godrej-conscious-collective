
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
	RefObject,
} from "react"
import { useRef } from "react"

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
import { When_And_Where_On_Sidebar } from "../chrome/when-and-where-on-sidebar.tsx"
import { Registration_Form_Trigger } from "../registration/registration-form-trigger.tsx"
import { Registration_Provider } from "../registration/registration-provider.tsx"

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

	// Shared with the sidebar's <When_And_Where_On_Sidebar />, which watches the
	// footer to hide its copy as the footer's own copy approaches. A ref keeps
	// that wiring out of this component's render path: scrolling re-renders the
	// leaf that owns the fade and nothing above it.
	const footer_ref = useRef<HTMLElement>( null )

	// Custom properties are not part of React's `CSSProperties`, and widening
	// the type is the whole of what the cast buys. The keys are this project's
	// own, produced one line away in `context-colours.ts`.
	//
	// **The tunnel's provider wraps the whole page**, because both of its
	// channels are on it: the screen channel here, above everything, and the
	// sidebar channel below. One provider per page, so nothing leaks between
	// two independently mounted trees.
	/**
	 |
	 | **The registration provider wraps the whole page, inside the tunnel's
	 | provider.** Inside, because the overlay it owns travels through the
	 | screen channel and the fill needs a provider above it. Wrapping the page,
	 | because the form is not a route — a visitor registers from wherever they
	 | happen to be, so the overlay has to be mounted on every page there is.
	 |
	 | The page's own markup is handed to it as `children`, which is what keeps
	 | opening the form from re-rendering the page: the element is referentially
	 | unchanged when the provider's state moves, so React bails out of the
	 | whole subtree. See the provider.
	 |
	 */
	return <Slot_Provider>
		<Registration_Provider
			main_event={ main_event }
			page_shell={ page_shell }>
			<div
				className="h-full bg-white"
				style={ colours as CSSProperties }>
				{
					/* Anything that has to escape the layout entirely — the
				     filtration drawer, and the registration overlay. It sits
				     outside the column flow and above the chrome, so nothing
				     sticky, scrolled or stacked can clip it. */
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
							footer_ref={ footer_ref }
							main_event={ main_event }
							standfirst={ standfirst }
							title={ title }>
							{ sidebar }
						</Sidebar> }

						<Main_Column
							masthead={ masthead }
							sidebar_repeat={ sidebar_repeat }
							two_column={ two_column }>
							{ main }
						</Main_Column>
					</main>

					<Site_Footer
						ref={ footer_ref }
						main_event={ main_event }
						page_shell={ page_shell } />

					{
						/* Register Now below the medium breakpoint, where the
					     header's button is not there. In flow rather than fixed,
					     so it holds the page's bottom 4rem open — which is what
					     the drawer rests on when it is closed. */
					}
					<Registration_Form_Trigger
						className="sticky bottom-0 md:hidden z-30"
						main_event={ main_event } />
				</div>
			</div>
		</Registration_Provider>
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
 | **When and Where sits at the foot of it, pinned to the bottom of the visible
 | area.** That is why the column itself is the flex container from the medium
 | breakpoint up rather than the box inside it: the pinned copy needs a
 | containing block as tall as the column, and the box inside is only as tall as
 | what it holds. A `sticky bottom-0` inside that box could never leave it.
 |
 | The column's height comes from the main column beside it, so making it the
 | flex container costs the page nothing. Giving the inner box a viewport height
 | instead would have forced every short page a full screen taller than its own
 | content.
 |
 */
function Sidebar (
	{
		at_every_width,
		back_link,
		children,
		footer_ref,
		main_event,
		standfirst,
		title,
	}: {
		at_every_width: boolean
		back_link: ReactNode
		children: ReactNode
		footer_ref: RefObject<HTMLElement | null>
		main_event: Event | null
		standfirst?: string | null
		title: string | null
	},
) {
	return <div
		className={ `${
			at_every_width ? "" : "max-md:hidden "
		}layout__1-4__col-1 md:pl-1ccm pb-6 bg-gray-light md:flex md:flex-col md:justify-between` }>
		<div className="cc mx-auto sticky top-0 flex flex-col items-start pt-6 md:pt-8 md:pb-6">
			{ back_link }

			<div className="mt-4">
				<Page_Title standfirst={ standfirst } title={ title } />
			</div>

			{
				/* `self-stretch` because the column is `items-start`, which
			     is there to keep the back link at its own width. Until this
			     region was wrapped for its spacing, everything below the
			     title was a flex item in its own right and could ask for the
			     column's width with `w-full` — the filtration widget does.
			     The wrapper made that `w-full` resolve against a
			     shrink-to-fit box instead, and the widget collapsed to its
			     widest row. */
			}
			<div className="empty:hidden mt-6 self-stretch">
				<Level>
					{ children }

					<Slot name={ SIDEBAR } />
				</Level>
			</div>
		</div>

		{
			/* The footer carries a copy of the same lines, and this one takes
		     itself off the screen before the two can meet — which is what it
		     needs the footer's element for. Below the medium breakpoint
		     neither copy is drawn: the footer hides its own with the same
		     `max-md:hidden`, so there is nothing here to get out of the way
		     of and the observation never starts. */
		}
		<div className="max-md:hidden cc mx-auto md:sticky bottom-0">
			{
				/* The padding is inside the collapsing box rather than on the
			     sticky one, so it goes with the content: `bottom-0` pins the
			     border box to the viewport's edge and takes no notice of the
			     column's own padding, so without this the last line would sit
			     against the bottom of the screen. */
			}
			<When_And_Where_On_Sidebar
				className="max-w-68 pb-8"
				event={ main_event }
				footer_ref={ footer_ref } />
		</div>
	</div>
}

/**
 |
 | The page's own name, and the line under it.
 |
 | The sidebar is the one place it appears, which makes it a two-column page's
 | alone: a one-column page renders no sidebar and no title with it.
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

	return <div>
		<H className="text-h2 font-semibold text-context">{ title }</H>

		{ standfirst
			&& <p className="mt-2 text-caption text-black">{ standfirst }</p> }
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
 | **The page's own title is never rendered here.** A two-column page shows it
 | in the sidebar; a one-column page shows it nowhere at all — the column opens
 | with whatever the editor put first, and a page that wants its name at the
 | top says so in a block of its own.
 |
 */
function Main_Column (
	{ children, masthead, sidebar_repeat, two_column }: {
		children: ReactNode
		masthead: ReactNode
		sidebar_repeat: ReactNode
		two_column: boolean
	},
) {
	const body = <>
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
					<Level>{ children }</Level>
				</div>
			</div>
			// Nothing wraps the blocks on a one-column page: each section is
			// full-width and brings its own padding and its own container.
			: <div className="text-black">
				<Level>{ children }</Level>
			</div> }
	</>

	return <div
		className={ two_column
			// Grey, not white — the white is the box inside. The two are the
			// same width until the viewport passes the design width, where the
			// content container re-centres and its margin grows past four
			// rems; from there this track is wider than the box it holds, and
			// what shows down the right of the page is this grey.
			? "layout__1-4__col-2 bg-gray-light"
			// A one-column page's sections run edge to edge, and the blocks
			// that have to run off those edges do it with margins measured
			// from `100vw`. Where a browser draws a classic scrollbar that is
			// a few pixels wider than the column actually is, so the overflow
			// is clipped rather than left to put a second scrollbar along the
			// bottom of every page.
			: "w-full overflow-x-hidden bg-white" }>
		{ two_column
			// The white box, and everything the column holds is inside it.
			// Nine columns and two gutters — two gutters wider than the
			// `md:w-9c` container below it, all of that on the right, because
			// a block is laid out from the left. Those two gutters are what a
			// full-bleed block runs out into. See `use_column_bleed` in
			// `section-frame.tsx`.
			? <div className="md:w-9c2g bg-white">{ body }</div>
			: body }
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
