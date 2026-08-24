
/**
 |
 | The masthead: a session's name, its standfirst and its cover, at the head of
 | the main column.
 |
 | **It has no component behind it.** Every component maps to exactly one block,
 | and some blocks map to no component at all because they are built from an
 | entry's top-level attributes — this is the first of those, and the
 | ContributorProfile will be the second. There is no version of a session page
 | without a masthead, so offering an editor the choice would be offering them a
 | way to make a page that does not work.
 |
 | It carries the document's `h1`, which is why root assembly leaves the
 | sidebar's title empty on a session: a name said twice is two first headings
 | saying the same thing.
 |
 | Lifted from the static site's own masthead, including its mobile back link.
 | That button is here because a session's sidebar is hidden below the medium
 | breakpoint, exactly as the static site hides it — so on a phone this is where
 | the back link is. It is a second rendering of the same destination, in the
 | design's other colour for it, and root assembly leaves it out on the one
 | arrangement that has no sidebar to be the first.
 |
 */

import type { Responsive_Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { responsive_picture_of } from "../media.ts"
import { Responsive_Picture } from "../pictures.tsx"

import { H } from "#infra/lib/ui/react/headings.tsx"

import { Back_Link } from "./back-link.tsx"

type Masthead_Props = {
	title: string
	standfirst?: string | null
	cover?: Responsive_Image_Attribute | null
	/** Shown below the medium breakpoint only. Null where there is no sidebar. */
	back_link?: { label: string; url: string } | null
}

export function Masthead (
	{ back_link, cover, standfirst, title }: Masthead_Props,
) {
	const pictures = responsive_picture_of( cover, use_media_origin() )

	return <div className="relative overflow-hidden md:pl-16 bg-context">
		<div
			className={ `relative cc mx-auto pt-6 md:py-31 z-10 md:after:hidden after:absolute after:top-0 after:left-full after:size-full after:bg-linear-to-r after:from-context after:via-45% after:to-transparent${
				pictures ? "" : " max-md:pb-6"
			}` }>
			{ back_link && <div className="md:hidden">
				<Back_Link
					color="white"
					label={ back_link.label }
					url={ back_link.url } />
			</div> }

			<H
				className={ `${
					back_link ? "mt-4 md:mt-0 " : ""
				}md:w-98 text-h2 font-semibold text-white` }>
				{ title }
			</H>

			{ standfirst
				&& <p className="mt-4 md:mt-8 md:w-98 text-p text-white">
					{ standfirst }
				</p> }
		</div>

		{ pictures && <div className="md:absolute top-0 left-114 size-full">
			<figure className="mt-6 md:m-0 relative size-full max-md:aspect-square after:absolute after:top-0 after:left-0 after:size-full after:bg-linear-to-b after:from-context after:via-context/0 after:via-45% after:to-transparent md:after:bg-linear-to-r md:after:via-15%">
				<Responsive_Picture
					className="size-full object-cover"
					pictures={ pictures } />
			</figure>
		</div> }
	</div>
}
