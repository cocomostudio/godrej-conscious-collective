
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
 | **What a card does when it is pointed at varies too, and it is the one thing
 | here an editor chooses.** It arrives as `style_and_transition` on each of the
 | three listings and is passed straight down to every card in them, because it
 | is a property of the listing rather than of the track or of any one card — a
 | rendering that overrode it would let two cards in one listing disagree about
 | what a hover means.
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
import { context_colour_of } from "./context-colours.ts"

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

export type Style_And_Transition = string | null | undefined

/**
 |
 | The one value that moves the card's fill. Named rather than both of them,
 | because only one of the two has to be recognised: **anything else is the
 | stroke treatment**, and that includes `null`.
 |
 | It has to include `null`, and that is the whole reason this is a comparison
 | rather than a lookup. A schema default is written when a row is written, not
 | when one is read, so every listing saved before the attribute existed comes
 | back with nothing in it — and reading nothing as anything other than the
 | default would give those listings a treatment the admin says they have not
 | got. `block-spacing.ts` reads its own attribute the same way, for the same
 | reason.
 |
 */
const CHANGE_FILL_ON_HOVER = "change-fill-on-hover"

/**
 |
 | The two treatments, as the two classes that differ between them.
 |
 | Both leave the card white and its points in the category's colour *or* black
 | at rest, and both move on `group-hover` — the group being the card's own
 | element, so the whole card is the target rather than the words a pointer
 | happens to be over.
 |
 |   • **fill** floods the details panel with the category's colour and drops
 |     the points to black, because points in the category's colour on a ground
 |     of the same colour are points nobody can read. **The featured card's
 |     rule goes with them**, and for exactly the same reason — it is drawn in
 |     the category's colour too, and a rule the same colour as the panel
 |     behind it is a rule that is not there.
 |
 |   • **stroke** leaves the panel white and takes the points up to the colour
 |     instead. Nothing is inverted, so nothing needs a second colour to stay
 |     legible against, and the rule keeps the category's colour throughout.
 |     **This is the default**, and therefore what an unset attribute draws as.
 |
 | The title stays black in both. It is the one thing on the card that has to be
 | readable before a visitor has decided to look, and a title that changed
 | colour under the pointer would be the loudest part of a movement meant to be
 | small.
 |
 | # Normalised colours
 |
 | `normalise_colors` forces the points line and the featured card's short rule
 | to black **at rest**, and it is the curated strip's default. Colour is what a
 | strip of ten mixed categories has too much of; what it needs is a date and a
 | category a visitor can read without the panel behind them fighting.
 |
 | Colour a pointer brings is another matter, so the two treatments part company
 | here:
 |
 |   • under **stroke**, both still go up to the category's colour on hover —
 |     which is what the stroke treatment *is*, and which gives the rule a hover
 |     state it does not otherwise have; and
 |
 |   • under **fill**, both stay black throughout, because the panel behind them
 |     is what moves and black is legible over either state of it.
 |
 */
const TREATMENTS = {
	"fill": {
		details: "bg-white group-hover:bg-context",
		points: "text-context group-hover:text-black",
		rule: "border-context group-hover:border-black",
	},
	// Both ends black, so neither carries a `group-hover:` at all: the panel
	// behind them is the only thing that moves.
	"fill, normalised": {
		details: "bg-white group-hover:bg-context",
		points: "text-black",
		rule: "border-black",
	},
	"stroke": {
		details: "bg-white",
		points: "text-black group-hover:text-context",
		// One class rather than two. Under the stroke the rule is the
		// category's colour at both ends, and `group-hover:` onto the colour
		// already showing is a transition to nowhere.
		rule: "border-context",
	},
	// The points are unchanged from the stroke above — that treatment had
	// already begun them at black. The rule is the whole of the difference,
	// and this is where it gains the hover state it does not otherwise have.
	"stroke, normalised": {
		details: "bg-white",
		points: "text-black group-hover:text-context",
		rule: "border-black group-hover:border-context",
	},
} as const

/**
 |
 | **Every class is written out whole**, rather than composed from the colour
 | it names, for the reason `context-colours.ts` gives about `ROLE_BACKGROUND`:
 | Tailwind scans the source for complete class names, so `border-${colour}` is
 | a class that never gets compiled and a rule that never gets drawn.
 |
 */
function treatment_of (
	style_and_transition: Style_And_Transition,
	normalise_colors: boolean,
) {
	const stroke = style_and_transition !== CHANGE_FILL_ON_HOVER

	return TREATMENTS[
		`${stroke ? "stroke" : "fill"}${
			normalise_colors ? ", normalised" : ""
		}` as keyof typeof TREATMENTS
	]
}

/**
 |
 | One session, as a listing draws it.
 |
 | `className` is the frame the track wants around it — a width, a shrink rule,
 | a `first:card--featured`. Everything inside is the same wherever it appears.
 |
 */
export function Card (
	{
		className = "",
		normalise_colors = false,
		session,
		style_and_transition,
	}: {
		className?: string
		/**
		 |
		 | Whether the points line and the featured card's rule are forced to
		 | black at rest. **Off here and on at the one listing that offers it**,
		 | because it is that listing's attribute rather than a card's: a card
		 | in any other listing was never asked, and off is what those have
		 | always drawn.
		 |
		 */
		normalise_colors?: boolean
		session: Session_Card
		style_and_transition?: Style_And_Transition
	},
) {
	const origin = use_media_origin()
	const cover = responsive_picture_of( session.cover, origin )
	const role = role_of_category( session.category )
	const treatment = treatment_of( style_and_transition, normalise_colors )

	return <Card_Link
		// `group` is what every `group-hover:` below hangs off, and the
		// context colour is re-pointed here rather than on the page, because
		// ten cards side by side can be ten cards of four categories. See
		// `context_colour_of`.
		className={ `group relative block rounded-lg overflow-hidden ${className}` }
		path={ session.path }
		style={ {
			...context_colour_of( role ),
			boxShadow: "0 4px 32px 0 rgba( 0, 0, 0, 0.10 )",
		} }>
		{
			/* **A session with no cover shows an empty frame**, not a decorative
		     one. The static site fills the gap with a random mesh gradient; a
		     picture invented by the site is a picture that says nothing about
		     the session it is standing in for, and the frame keeps its shape
		     either way so the row does not go ragged. */
		}
		{
			/* **The picture grows a little under a pointer, whichever
		     treatment the card wears** — the one part of the movement that is
		     not an editor's choice, because it is what says the card is
		     pressable rather than what says which category it is in.

		     The clip is the figure's own rather than the card's: in
		     `card--featured` the figure is a side panel with the details box
		     beside it, and a picture growing out of an unclipped figure would
		     paint over the words. */
		}
		<figure className="relative image aspect-4/3 overflow-hidden">
			{ cover && <Responsive_Picture
				className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
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
		<div
			className={ `details h-full p-4 md:p-6 transition-colors duration-300 ease-out ${treatment.details}` }>
			<p className="text-h4 text-black line-clamp-2">
				{ session.name }
			</p>

			<Points
				className={ `font-semibold transition-colors duration-300 ease-out ${treatment.points}` }
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
					<hr
						className={ `w-16 transition-colors duration-300 ease-out ${treatment.rule}` } />
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
