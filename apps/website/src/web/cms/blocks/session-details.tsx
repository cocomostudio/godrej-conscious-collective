
/**
 |
 | The details list: every fact a visitor needs to decide whether to attend,
 | without scrolling.
 |
 | Another block with no component behind it — it is built from a session's own
 | attributes, and `sessions.ts` works out what each row says. What is left here
 | is which icon a row wears and how it is laid out, both of which are the
 | design's business rather than the content model's.
 |
 | The booking link sits **inside** the price's row rather than below the list,
 | because the two answer one question and the design puts them together.
 |
 | **It renders in one column or in two**, because the design uses it in two
 | places: down the sidebar on a desktop, and across the top of the main column
 | on a phone, where that page's sidebar is hidden. The static site has the
 | same two.
 |
 | The `nth-last-child(2):nth-child(odd)` rules belong to the two-column variant
 | alone. They clear the border from the item that shares the last row with the
 | final one — which is what that selector means in a two-column grid, and is
 | not what it means in one column, where it would strip the border from the
 | second-to-last row instead. The static site puts one of the pair on its base
 | class, where it misfires down its own sidebar.
 |
 */

import type { ComponentType, SVGProps } from "react"
import { Link } from "react-router"

import type {
	Detail,
	Detail_Icon,
} from "../sessions.ts"

import { Calendar } from "#infra/lib/ui/react/icons/calendar.tsx"
import { Clock } from "#infra/lib/ui/react/icons/clock.tsx"
import { Location_Pin } from "#infra/lib/ui/react/icons/location-pin.tsx"
import { Tag } from "#infra/lib/ui/react/icons/tag.tsx"
import { Ticket } from "#infra/lib/ui/react/icons/ticket.tsx"
import { User } from "#infra/lib/ui/react/icons/user.tsx"

/**
 |
 | One icon per kind of detail. Typed against the union rather than left open,
 | so a seventh kind of row is a type error here rather than a row that renders
 | without its icon.
 |
 */
const ICONS: Record<Detail_Icon, ComponentType<SVGProps<SVGSVGElement>>> = {
	"calendar": Calendar,
	"clock": Clock,
	"location-pin": Location_Pin,
	"tag": Tag,
	"ticket": Ticket,
	"user": User,
}

export function Session_Details (
	{ columns = 1, details }: { columns?: 1 | 2; details: Detail[] },
) {
	// A session with no category, no instances, no dates, no venue and no price
	// contributes nothing, and an empty list is a bordered box around nothing.
	if ( details.length === 0 ) {
		return null
	}

	const across = columns === 2
		? " grid-cols-2 [&>*:nth-last-child(2):nth-child(odd)]:border-0 [&>*:nth-last-child(2):nth-child(odd)]:pb-0"
		: ""

	return <ul
		className={ `w-full grid gap-4 [&>*:last-child]:border-0 [&>*:last-child]:pb-0${across}` }>
		{ details.map( ( detail, index ) =>
			<Row
				detail={ detail }
				key={ `${detail.icon}:${index}` } />
		) }
	</ul>
}

function Row ( { detail }: { detail: Detail } ) {
	const Icon = ICONS[detail.icon]

	return <li className="border-b border-black/10 pb-4 flex items-center gap-2">
		<Icon className="size-4 shrink-0 text-black" />

		{ detail.label
			&& <span className="text-small font-semibold">
				{ detail.label }
			</span> }

		{ detail.link && <Detail_Link link={ detail.link } /> }
	</li>
}

/**
 |
 | A detail's link, in one of two emphases.
 |
 | The booking link asks a visitor to click and wears the uppercase button
 | typography and the slanted arrow. The venue link reads as a plain label —
 | its emphasis is on where it goes, not on being followed — and inherits
 | the row's own type styles so the label sits inline with the icon rather
 | than shouting out of it.
 |
 */
function Detail_Link ( { link }: { link: NonNullable<Detail["link"]> } ) {
	if ( link.emphasis === "call_to_action" ) {
		return <Link
			className="text-button uppercase text-context underline underline-offset-[3px]"
			to={ link.url }
			target="_blank"
			rel="noreferrer">
			{ link.label } ↗
		</Link>
	}

	return <Link
		className="text-small font-semibold text-black"
		to={ link.url }
		target="_blank"
		rel="noreferrer">
		{ link.label }
	</Link>
}
