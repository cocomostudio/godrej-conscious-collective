
/**
 |
 | The two things a listing is made of: a card for a session, a portrait for a
 | collaborator.
 |
 | Neither is a block. Eight renderings across three listing components draw one
 | or the other — four category renderings, three collaborator layouts and the
 | curated strip — and a card that each of them drew for itself would drift from
 | the rest on the first change to how a price sits beside an age group.
 |
 | What varies between the renderings is the **track**: how wide a card is,
 | whether it scrolls, whether it loops, how many sit in a row. That is the
 | listing's business. What a card *says* is the same everywhere, and it is
 | here.
 |
 | The class hooks — `image`, `details`, `points`, `when`,
 | `additional-details` — are the ones `tailwind-v3/components/card.css`
 | reaches for. The workshops listing puts `card--featured` on its first card
 | and those rules do the rest, which is why the figure and the details box are
 | direct children of the card's own element and must stay that way.
 |
 */

import {
	type ComponentProps,
	Fragment,
} from "react"

import type {
	Contributor_Card,
	Session_Card,
} from "./envelope.ts"
import {
	ROLE_BORDER,
	ROLE_TEXT,
} from "./context-colours.ts"

import { day_parts } from "./event-dates.ts"
import { use_media_origin } from "./media-origin.tsx"
import {
	picture_of,
	responsive_picture_of,
} from "./media.ts"
import { Nav_Link } from "./nav-link.tsx"
import {
	Picture_Image,
	Responsive_Picture,
} from "./pictures.tsx"
import {
	role_of_category,
	session_points,
} from "./sessions.ts"

/**
 |
 | One session, as a listing draws it.
 |
 | `className` is the frame the track wants around it — a width, a shrink rule,
 | a `first:card--featured`. Everything inside is the same wherever it appears.
 |
 */
export function Card (
	{ className = "", session }: {
		className?: string
		session: Session_Card
	},
) {
	const origin = use_media_origin()
	const cover = responsive_picture_of( session.cover, origin )
	const role = role_of_category( session.category )

	return <Card_Link
		className={ `relative block rounded-lg overflow-hidden ${className}` }
		path={ session.path }
		style={ { boxShadow: "0 4px 32px 0 rgba( 0, 0, 0, 0.10 )" } }>
		{
			/* **A session with no cover shows an empty frame**, not a decorative
		     one. The static site fills the gap with a random mesh gradient; a
		     picture invented by the site is a picture that says nothing about
		     the session it is standing in for, and the frame keeps its shape
		     either way so the row does not go ragged. */
		}
		<figure className="relative image aspect-4/3">
			{ cover && <Responsive_Picture
				className="size-full object-cover"
				pictures={ cover }
				sizes="( min-width: 1024px ) 24rem, 18rem" /> }

			<When
				className="absolute top-2 right-2 px-1.25 md:px-1.5 py-1 md:py-0"
				first={ session.session_date_first }
				last={ session.session_date_last } />
		</figure>

		{
			/* **The name is not a heading**, and this is deliberate.
		     A heading marks a section of *this* document. A card is a link to
		     another one — its content is not here — so a listing of ten cards
		     would put ten entries in the heading outline that lead nowhere in
		     the page a reader is navigating, drowning the section headings
		     that do. The title is still what identifies the card: it is inside
		     the link, so it is part of the link's accessible name, and both
		     list navigation and a links list still reach it. */
		}
		<div className="details h-full p-4 md:p-6 bg-white">
			<p className="text-h4 text-black line-clamp-2">
				{ session.name }
			</p>

			<Points
				className={ `font-semibold ${ROLE_TEXT[role]}` }
				points={ session_points( session ) } />

			{
				/* Shown only by `card--featured`, which the workshops listing
			     puts on its first card from the medium breakpoint upward.
			     `additional-details` is hidden by default in the card CSS
			     partial and revealed by `.card--featured` — the utility
			     `hidden` would land in a later cascade layer than the
			     component partial and could not be overridden by it. */
			}
			{ session.standfirst
				&& <div className="additional-details mt-8">
					<hr className={ `w-16 ${ROLE_BORDER[role]}` } />
					<p className="mt-8 text-h5 text-black">
						{ session.standfirst }
					</p>
				</div> }
		</div>
	</Card_Link>
}

/**
 |
 | A card links to the session it names, unless there is nothing to link to.
 |
 | A session with no alias is a real state — an entry whose URL has not been
 | generated yet — and a card that stayed pressable would take a visitor to a
 | 404. It renders as the same card, unpressable.
 |
 */
function Card_Link (
	// The props are borrowed from `Nav_Link` rather than written out, and
	// `children` is the reason — the same one `nav-link.tsx` gives. React
	// Router resolves `@types/react` to the copy the CMS pins, so a `ReactNode`
	// written here is not assignable to the `ReactNode` it expects.
	{ children, className = "", path, style }:
		& Omit<ComponentProps<typeof Nav_Link>, "url">
		& { path: string | null },
) {
	if ( !path ) {
		return <div className={ className } style={ style }>{ children }</div>
	}

	return <Nav_Link className={ className } style={ style } url={ path }>
		{ children }
	</Nav_Link>
}

function Points (
	{ className = "", points }: { className?: string; points: string[] },
) {
	if ( points.length === 0 ) {
		return null
	}

	return <ul
		className={ `points mt-2 flex gap-1 text-p md:text-h6 font-medium *:shrink-0 [&>*:first-child]:shrink [&>*:first-child]:whitespace-nowrap [&>*:first-child]:overflow-hidden [&>*:first-child]:text-ellipsis ${className}` }>
		{ points.map( ( point, index ) =>
			<Fragment key={ index }>
				<li>{ point }</li>
				<li aria-hidden={ true } className="last:hidden">·</li>
			</Fragment>
		) }
	</ul>
}

/**
 |
 | The day badge over the picture.
 |
 | Hidden from assistive technology: the same days are in the session's own
 | page, and read aloud as "Dec 11 14" the badge is noise rather than
 | information.
 |
 | Both ends are `date` attributes, split rather than parsed, for the reason
 | `event-dates.ts` gives — a `Date` built from a bare day is midnight UTC, and
 | west of it the 11th reads as the 10th.
 |
 */
function When (
	{ className = "", first, last }: {
		className?: string
		first: string | null
		last: string | null
	},
) {
	const start = day_parts( first )
	const end = day_parts( last )

	if ( !start ) {
		return null
	}

	const closing = end && end.value !== start.value ? end : null

	return <div
		className={ `when rounded-[5px] bg-white text-black ${className}` }
		aria-hidden={ true }>
		<p className="h-5 md:h-6 flex justify-center items-center text-p uppercase font-medium">
			<span>{ start.month }</span>
			&nbsp;
			<time dateTime={ start.value }>{ start.day }</time>
			{ closing && <>
				<span>-</span>
				<time dateTime={ closing.value }>{ closing.day }</time>
			</> }
		</p>
	</div>
}

/**
 |
 | One collaborator: a round picture with a name and a role under it.
 |
 | All three collaborator layouts draw this and differ only in how they arrange
 | it.
 |
 | **The name is not a heading**, for the reason the card gives above: this is a
 | link to the collaborator's own page rather than a section of the page being
 | read, and a grid of ten of them would bury the section headings a reader
 | navigates by. The static site's grid does use an `h3`; its home carousel uses
 | a `p` for the same words, and the `p` is the one that is right.
 |
 */
export function Portrait (
	{
		caption_className = "",
		className = "",
		contributor,
		figure_className = "",
		image_className = "",
	}: {
		/**
		 |
		 | The three inner frames a layout may want a hold of. The carousel
		 | tweens all three every frame and needs its own hooks on them; the
		 | other two layouts pass nothing and get the portrait as it is.
		 |
		 */
		caption_className?: string
		className?: string
		contributor: Contributor_Card
		figure_className?: string
		image_className?: string
	},
) {
	const origin = use_media_origin()
	const picture = picture_of( contributor.image, origin )

	return <Card_Link
		className={ `flex flex-col items-center w-full ${className}` }
		path={ contributor.path }>
		<figure className={ `w-full select-none ${figure_className}` }>
			{ picture
				? <Picture_Image
					className={ `w-full aspect-square rounded-full object-cover ${image_className}` }
					picture={ {
						...picture,
						alt: picture.alt || contributor.name,
					} }
					sizes="( min-width: 1024px ) 14rem, 10.5rem" />
				// An empty frame rather than a stand-in picture, as the card
				// does. It keeps its shape so a grid row stays level and the
				// captions beside it stay in line.
				: <div
					className={ `w-full aspect-square rounded-full ${image_className}` } /> }

			<figcaption className={ `mt-4 text-center ${caption_className}` }>
				<p className="text-h5 font-semibold text-black line-clamp-2">
					{ contributor.name }
				</p>

				{ contributor.role
					&& <p className="mt-1 md:mt-2 text-h6 text-black line-clamp-2">
						{ contributor.role }
					</p> }
			</figcaption>
		</figure>
	</Card_Link>
}
