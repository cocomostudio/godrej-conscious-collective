
/**
 |
 | Map — a leaf. Where something is.
 |
 | **The image path is preferred, and it is the one that costs the visitor
 | nothing.** With a picture set, the map is that picture inside a link and the
 | page makes no third-party request at all. With no picture, a Google Map is
 | embedded — which loads Google's scripts and sets Google's cookies before the
 | visitor has done anything, on a page they may only be reading for an address.
 |
 | The static site already ships its map as a hand-drawn local SVG, so the
 | cheaper path is also the one the design asked for.
 |
 */

import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

import type { Responsive_Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { responsive_picture_of } from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import { Responsive_Picture } from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

const FRAME =
	"w-full aspect-[4/3] object-cover rounded-lg bg-gray-light overflow-hidden"

export type Map_Attribute = {
	label?: string | null
	address?: string | null
	map_url: string
	image?: Responsive_Image_Attribute | null
}

export function Google_Map (
	{ address, image, label, map_url }: Map_Attribute,
) {
	const pictures = responsive_picture_of( image, use_media_origin() )

	return <div className={ BLOCK_SPACING }>
		{ pictures
			? <figure>
				<Nav_Link className="block" url={ map_url }>
					<Responsive_Picture
						className={ `${FRAME} grayscale opacity-65` }
						pictures={ pictures } />
				</Nav_Link>
			</figure>
			: <Embedded_Map address={ address } map_url={ map_url } /> }

		{ address
			&& <address className="mt-4 text-p font-medium not-italic text-black">
				{ address.split( "\n" ).map( ( line, index ) =>
					<span key={ index }>
						{ index > 0 && <br /> }
						{ line }
					</span>
				) }
			</address> }

		{ map_url && <p className="mt-4">
			<Button
				emphasis="outline"
				color="context"
				render={ <Nav_Link url={ map_url } target="_blank" /> }>
				{ label || "View on Maps" }
				<Button.Icon name="chevron-right" />
			</Button>
		</p> }
	</div>
}

/**
 |
 | The fallback, and the reason the image above exists.
 |
 | The keyless embed endpoint is used deliberately: the alternative wants an API
 | key, which is one more secret to hold for a picture of a street.
 |
 */
function Embedded_Map (
	{ address, map_url }: { address?: string | null; map_url: string },
) {
	const query = ( address || map_url || "" ).trim()

	if ( !query ) {
		return null
	}

	return <iframe
		className={ `${FRAME} border-0` }
		src={ `https://maps.google.com/maps?q=${
			encodeURIComponent( query )
		}&output=embed` }
		title="Map"
		loading="lazy"
		referrerPolicy="no-referrer-when-downgrade" />
}
