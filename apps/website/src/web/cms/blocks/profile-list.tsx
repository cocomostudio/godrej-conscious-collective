
/**
 |
 | Profile list — a leaf. A group of people, such as the core team.
 |
 | `profiles` is a **repeatable component list, not a region.**
 |
 | Deliberately not Contributors. These people are not part of a session, they
 | have no page of their own, and giving them one would put them in every
 | collaborator listing on the site.
 |
 */

import {
	H,
	Level,
} from "#infra/lib/ui/react/headings.tsx"

import type { Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import { Picture_Image } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

type Profile = {
	name?: string | null
	role?: string | null
	description?: string | null
	image?: Image_Attribute | null
}

export function Profile_List ( { profiles = [] }: { profiles?: Profile[] } ) {
	const origin = use_media_origin()

	if ( profiles.length === 0 ) {
		return null
	}

	return <ul
		className={ `${BLOCK_SPACING} grid gap-6 md:grid-cols-2 md:gap-8` }>
		<Level>
			{ profiles.map( ( profile, index ) => {
				const picture = picture_of( profile?.image, origin )

				return <li key={ index }>
					<div className="flex flex-wrap items-center gap-x-8 gap-y-4">
						{ picture && <Picture_Image
							className="w-37 lg:w-51 shrink-0 aspect-square rounded-full object-cover grayscale"
							picture={ {
								...picture,
								alt: picture.alt || profile?.name || "",
							} } /> }

						<div className="grow basis-full md:basis-0 text-small">
							<H className="text-h4 md:font-semibold text-black">
								{ profile?.name }
							</H>

							{ profile?.role
								&& <p className="mt-2 md:mt-4 text-small text-black font-semibold md:font-medium">
									{ profile.role }
								</p> }
						</div>
					</div>

					{ profile?.description
						&& <p className="mt-4 text-p text-black">
							{ profile.description }
						</p> }
				</li>
			} ) }
		</Level>
	</ul>
}
