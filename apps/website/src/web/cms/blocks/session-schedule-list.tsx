
/**
 |
 | Session schedule list — a leaf. The schedule page.
 |
 | The whole programme of the page's event, read hour by hour rather than
 | category by category, with three things wrapped around it:
 |
 |   • a **sticky list header** saying how many are showing, carrying the link
 |     that downloads the event's schedule document and — below the medium
 |     breakpoint — the trigger that opens the filters;
 |
 |   • a **sticky navigation header**: one equal-width tab per day, with a
 |     progress bar underneath that fills as a visitor scrolls through that
 |     day's entries; and
 |
 |   • the **filtration widget**, in the sidebar from the medium breakpoint up
 |     and in a drawer below it, carrying the category facet that the category
 |     listing pages drop.
 |
 | **One entry per instance**, which is why the header's count is larger than
 | the number of sessions the CMS sent. See `schedule-entries.ts`.
 |
 | The two headers and the list must stay children of the same container: both
 | headers are sticky, so their containing block is that container, and each can
 | only stay put while the list scrolls under it as long as all three live there
 | together. `order-last` pins the list below whichever way they are reordered.
 |
 */

import type { RefObject } from "react"
import {
	Fragment,
	useMemo,
	useRef,
} from "react"

import type {
	Media,
	Session_Schedule_Row,
} from "../envelope.ts"
import type { Schedule_Entry } from "./schedule-entries.ts"

import { BLOCK_SPACING } from "./block-spacing.ts"
import { ROLE_TEXT } from "../context-colours.ts"
import {
	day_anchor,
	schedule_days,
	schedule_entries,
} from "./schedule-entries.ts"
import { facets_for } from "../filtration/facets.ts"
import { Filtration_Trigger } from "../filtration/filtration-trigger.tsx"
import { Filtration_Widget } from "../filtration/filtration-widget.tsx"
import {
	media_url,
	responsive_picture_of,
} from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { ordinal_day } from "../event-dates.ts"
import { Responsive_Picture } from "../pictures.tsx"
import {
	role_of_category,
	session_points,
	time_of_day,
} from "../sessions.ts"
import {
	Sessions,
	use_filtered_sessions,
	use_loaded_sessions,
} from "../filtration/sessions.tsx"
import {
	No_Matches,
	Showing,
} from "../filtration/showing.tsx"
import { use_day_scroll_progress } from "./use-day-scroll-progress.ts"
import { use_filtration_visibility } from "../filtration/use-filtration-visibility.ts"
import { use_media_origin } from "../media-origin.tsx"

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"
import { Calendar } from "#infra/lib/ui/react/icons/calendar.tsx"
import { Download } from "#infra/lib/ui/react/icons/download.tsx"
import { Icon_Button } from "#infra/lib/ui/react/buttons/icon-button.tsx"
import { use_height_as_custom_property } from "#infra/lib/ui/react/use-height-as-custom-property.ts"

/** What the list header publishes for the day tabs to sit beneath. */
const HEADER_HEIGHT = "--schedule-header-height"

type Session_Schedule_List_Props = {
	sessions?: Session_Schedule_Row[]
	/**
	 |
	 | The resolved event's schedule document, spliced onto this node by the
	 | CMS. Null where the event has none, and the download link is not drawn
	 | at all — a link to a document nobody uploaded is worse than no link.
	 |
	 */
	schedule?: Media | null
}

export function Session_Schedule_List (
	{ schedule = null, sessions = [] }: Session_Schedule_List_Props,
) {
	return <div className={ BLOCK_SPACING }>
		<Sessions sessions={ sessions }>
			<Schedule schedule={ schedule } />
		</Sessions>
	</div>
}

function Schedule ( { schedule }: { schedule: Media | null } ) {
	const loaded = use_loaded_sessions<Session_Schedule_Row>()
	const showing = use_filtered_sessions<Session_Schedule_Row>()

	const facets = useMemo(
		() => facets_for( "schedule", loaded ),
		[ loaded ],
	)

	// The tabs come from everything that was loaded rather than from what
	// survives, so filtering narrows what sits under a day instead of taking
	// the day away.
	const days = useMemo(
		() => schedule_days( schedule_entries( loaded ) ),
		[ loaded ],
	)

	const entries = useMemo( () => schedule_entries( showing ), [ showing ] )

	const filtration = use_filtration_visibility()

	const container = useRef<HTMLDivElement>( null )
	const header = useRef<HTMLDivElement>( null )
	const bar = useRef<HTMLElement>( null )
	const list = useRef<HTMLDivElement>( null )

	// Below the medium breakpoint the two headers stick as a pair, the tabs
	// directly beneath the list header. The tabs' offset is therefore the list
	// header's height, which CSS cannot read — so it is published here for the
	// tabs to read. From the medium breakpoint up the list header does not
	// stick and the tabs' own `md:top-0` wins.
	use_height_as_custom_property( {
		property: HEADER_HEIGHT,
		source: header,
		target: container,
	} )

	const active = use_day_scroll_progress( { bar, days, list } )

	return <div className="flex flex-col" ref={ container }>
		<List_Header
			count={ entries.length }
			facets={ facets }
			on_open={ filtration.show }
			ref={ header }
			schedule={ schedule } />

		<Day_Navigation
			active={ active }
			days={ days }
			ref={ bar } />

		{
			/* A sibling of the headers rather than a child of one. Where there
		     is a sidebar it renders nothing here; where there is not, it falls
		     back to rendering in place, and in place has to be somewhere a
		     form can be laid out. */
		}
		<Filtration_Widget
			facets={ facets }
			on_dismiss={ filtration.hide }
			visible={ filtration.visible } />

		<div className="order-last" ref={ list }>
			<Entries entries={ entries } />
		</div>
	</div>
}

/**
 |
 | How many are on, the way to download the schedule, and the filter trigger.
 |
 | **Sticky below the medium breakpoint**, where the list scrolls under it. The
 | stickiness and the backdrop go on the full-width wrapper rather than on the
 | row inside it, so the list passes under the whole width of the header rather
 | than under the words alone.
 |
 | The count is of **entries** — one per instance — because that is how many
 | things are on, which is the question the schedule page answers.
 |
 */
function List_Header (
	{ count, facets, on_open, ref, schedule }: {
		count: number
		facets: ReturnType<typeof facets_for>
		on_open: () => void
		ref: RefObject<HTMLDivElement | null>
		schedule: Media | null
	},
) {
	return <div
		className="max-md:sticky max-md:top-0 max-md:z-10 max-md:-mx-1ccm max-md:px-1ccm max-md:py-4 max-md:bg-gray-light"
		ref={ ref }>
		<div className="flex items-center gap-2">
			<Showing
				className="text-h6 md:text-h3 md:font-semibold font-light text-theme md:text-black"
				count={ count } />

			<Filtration_Trigger
				className="ml-auto"
				colour="theme"
				facets={ facets }
				on_press={ on_open } />

			{ schedule && <Download_The_Schedule schedule={ schedule } /> }
		</div>
	</div>
}

/**
 |
 | The download link, drawn twice: as a glyph on a phone, where the trigger
 | beside it has already taken the room, and as a labelled button from the
 | medium breakpoint up.
 |
 | It is an anchor with `download` rather than a button, because that is what it
 | is — a link to a file — and because it then works with the middle mouse
 | button, with a right-click, and without JavaScript.
 |
 | The file is on the CMS's own origin, so the URL goes through the media origin
 | the rest of the site's uploads do.
 |
 */
function Download_The_Schedule ( { schedule }: { schedule: Media } ) {
	const url = media_url( schedule.url, use_media_origin() )

	if ( !url ) {
		return null
	}

	return <>
		<Icon_Button
			aria-label="Download the schedule"
			className="md:hidden"
			colour="theme"
			emphasis="solid"
			render={ <a download={ schedule.name ?? "" } href={ url } /> }>
			<Download />
		</Icon_Button>

		<Button
			className="max-md:hidden ml-auto"
			color="theme"
			emphasis="solid"
			render={ <a download={ schedule.name ?? "" } href={ url } /> }>
			<Button.Icon name="download" />
			Download Schedule
		</Button>
	</>
}

/**
 |
 | One equal-width tab per day, with a bar beneath that fills as the day's
 | entries scroll past.
 |
 | Equal width however many entries a day holds, which is what
 | `use_day_scroll_progress` exists to make true: the fill is piecewise, not
 | linear in scroll depth.
 |
 | Labelled "Secondary" because the site's own navigation is the primary one and
 | this is a second set of links within one page.
 |
 */
function Day_Navigation (
	{ active, days, ref }: {
		active: number
		days: string[]
		ref: RefObject<HTMLElement | null>
	},
) {
	if ( days.length === 0 ) {
		return null
	}

	return <nav
		aria-label="Days"
		className="sticky max-md:top-[var(--schedule-header-height,0px)] md:top-0 -mx-1ccm md:-mx-16 md:order-first md:mt-0 md:mb-8 after:absolute after:-bottom-0.25 after:w-full after:h-0.75 after:content-[''] after:bg-context after:origin-left after:scale-x-[--scale-x] after:transition-transform"
		ref={ ref }
		style={ { "--scale-x": "0" } as React.CSSProperties }>
		{
			/* The clip path lets the shadow show beneath the bar only; its
		     sideways bleed is cut, because a box shadow is not clipped by
		     `overflow` on its own. */
		}
		<ul className="flex bg-white *:grow *:basis-0 shadow-[0_4px_8px_0] shadow-[rgba(0,0,0,0.04)] overflow-hidden [clip-path:inset(0_0_-16px_0)] *:border-black/[0.075] [&>*:not(:last-child)]:border-r">
			{ days.map( ( day, index ) =>
				<li
					className={ `transition-colors ${
						index === active ? "text-theme" : ""
					}` }
					key={ day }>
					<Nav_Link
						className="block pl-4 py-4 md:pl-16 md:py-8"
						url={ `#${day_anchor( day )}` }>
						<span
							className={ `block text-p ${
								index === active ? "font-semibold" : ""
							}` }>
							{ `Day ${index + 1}` }
						</span>
						<span
							className={ `text-h5 ${
								index === active ? "font-semibold" : ""
							}` }>
							{ ordinal_day( day ) }
						</span>
					</Nav_Link>
				</li>
			) }
		</ul>
	</nav>
}

function Entries ( { entries }: { entries: Schedule_Entry[] } ) {
	if ( entries.length === 0 ) {
		return <No_Matches />
	}

	// The first entry of each day carries that day's anchor, so the tab above
	// has something to land on. A day whose every entry has been filtered out
	// has no anchor and its tab lands nowhere, which is the honest answer:
	// there is nothing of that day left to scroll to.
	const anchored = new Set<string>()

	return <ul className="[&>*:not(:last-child)]:border-b-2">
		{ entries.map( ( entry ) => {
			const day = entry.day
			const opens_a_day = day !== null && !anchored.has( day )

			if ( opens_a_day ) {
				anchored.add( day )
			}

			return <Entry
				anchor={ opens_a_day ? day_anchor( day ) : undefined }
				entry={ entry }
				key={ entry.key } />
		} ) }
	</ul>
}

/**
 |
 | One sitting of one session: a picture, the hours, the name, and the three
 | points a card carries.
 |
 | `data-day` is what `use_day_scroll_progress` measures the day boundaries
 | from, so it stays on the list item itself.
 |
 | **The name is not a heading**, for the reason a listing card's is not: this
 | is a link to a different document, and forty of them in the heading outline
 | would bury the sections of the page a reader is navigating.
 |
 */
function Entry (
	{ anchor, entry }: { anchor?: string; entry: Schedule_Entry },
) {
	const { day, instance, session } = entry
	const origin = use_media_origin()
	const cover = responsive_picture_of( session.cover, origin )
	const role = role_of_category( session.category )

	return <li
		className="py-6 md:py-8 md:flex items-start gap-8 border-gray-light"
		data-day={ day ?? undefined }
		id={ anchor }>
		<figure className="max-md:hidden w-41 shrink-0 aspect-4/3 rounded-lg overflow-hidden">
			{ cover && <Responsive_Picture
				className="size-full object-cover"
				pictures={ cover }
				sizes="10.25rem" /> }
		</figure>

		<When
			all_day={ session.all_day_event }
			className="md:order-last md:w-44 shrink-0 uppercase text-small font-semibold md:font-medium text-black md:text-right"
			instance={ instance } />

		<div className="grow min-w-0">
			<p
				className={ `mt-2 md:mt-0 text-h4 ${
					ROLE_TEXT[role]
				} md:text-black` }>
				<Entry_Link path={ session.path }>
					{ session.name }
				</Entry_Link>
			</p>

			<div className="max-md:flex justify-between gap-4 md:mt-2">
				<div className="min-w-0">
					{ session.standfirst
						&& <p className="mt-2 md:mt-0 text-h6 md:font-light line-clamp-1 md:line-clamp-2">
							{ session.standfirst }
						</p> }

					<Points session={ session } />
				</div>

				{
					/* The Add to Calendar stub, as it is on a session's own
				     page: the design draws the control and the ticket that
				     fills it in has not arrived. */
				}
				<Icon_Button
					aria-label="Add to calendar"
					className="md:hidden self-end"
					colour="black"
					disabled
					emphasis="outline">
					<Calendar />
				</Icon_Button>
			</div>
		</div>
	</li>
}

function Entry_Link (
	{ children, path }: { children: string; path: string | null },
) {
	if ( !path ) {
		return <>{ children }</>
	}

	return <Nav_Link url={ path }>{ children }</Nav_Link>
}

/**
 |
 | The hours this sitting runs, or "All day" where the session says so.
 |
 | The stored instance keeps its hours either way — a calendar entry still needs
 | them — and showing a start time that does not mean anything misleads a
 | visitor deciding when to come. The same rule the sidebar's details list
 | follows.
 |
 */
function When (
	{ all_day, className = "", instance }: {
		all_day: boolean
		className?: string
		instance: Schedule_Entry["instance"]
	},
) {
	if ( all_day ) {
		return <p className={ className }>All day</p>
	}

	const start = time_of_day( instance?.time_start )
	const end = time_of_day( instance?.time_end )

	if ( !start ) {
		return null
	}

	return <p className={ className }>
		<time dateTime={ instance.time_start ?? undefined }>{ start }</time>
		{ end && <>
			<span>{ " – " }</span>
			<time dateTime={ instance.time_end ?? undefined }>{ end }</time>
		</> }
	</p>
}

/**
 |
 | The three points, drawn the way the schedule draws them.
 |
 | The words come from `session_points`, which a listing card reads too — the
 | two differ in their size and their colour and in nothing they say. The middot
 | is its own item, hidden from assistive technology and from the last row, for
 | the reason the card's is.
 |
 */
function Points ( { session }: { session: Session_Schedule_Row } ) {
	const points = session_points( session )

	if ( points.length === 0 ) {
		return null
	}

	return <ul className="mt-3.5 md:mt-2 flex gap-1 *:text-h6 font-medium md:font-semibold text-black/65 *:shrink-0 [&>*:first-child]:shrink [&>*:first-child]:min-w-0 [&>*:first-child]:whitespace-nowrap [&>*:first-child]:overflow-hidden [&>*:first-child]:text-ellipsis">
		{ points.map( ( point, index ) =>
			<Fragment key={ index }>
				<li>{ point }</li>
				<li aria-hidden={ true } className="last:hidden">·</li>
			</Fragment>
		) }
	</ul>
}
