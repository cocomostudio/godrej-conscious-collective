
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
 | cheaper path is also the one the design asked for. It is also the only way
 | this component will ever be the colour of anything: an embed cannot be
 | restyled from outside, and a drawing already is whatever it was drawn as.
 |
 | Both paths end up the same shape — **a picture inside a link that opens
 | Google Maps** — which is why the branch below is only about where the
 | picture comes from. On a phone that link hands off to the Maps app, because
 | a `google.com/maps/place/…` address is a universal link and the operating
 | system claims it. A `comgooglemaps://` scheme would do the same thing worse:
 | it breaks on a desktop and it breaks when the app is not installed.
 |
 */

import type { ComponentProps } from "react"

import type { Image_Attribute } from "../media.ts"

import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import { Nav_Link } from "../nav-link.tsx"
import {
	Picture_Caption,
	Picture_Image,
} from "../pictures.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

const FRAME =
	"w-full aspect-[4/3] object-cover rounded-lg bg-gray-light overflow-hidden"

const OPEN_IN_MAPS = "Open this location in Google Maps"

export type Map_Attribute = {
	place_url: string
	latitude?: number | null
	longitude?: number | null
	zoom?: number | null
	image?: Image_Attribute | null
}

export function Google_Map (
	{ image, latitude, longitude, place_url, zoom }: Map_Attribute,
) {
	const picture = picture_of( image, use_media_origin() )

	return <figure className={ BLOCK_SPACING }>
		<Opens_In_Maps url={ place_url }>
			{ picture
				? <Picture_Image className={ FRAME } picture={ picture } />
				: <Embedded_Map
					latitude={ latitude }
					longitude={ longitude }
					zoom={ zoom } /> }
		</Opens_In_Maps>

		{ picture && <Picture_Caption className="mt-4" picture={ picture } /> }
	</figure>
}

/**
 |
 | The link both paths sit inside.
 |
 | An anchor rather than a click handler, and that is the whole reason this
 | works. A cross-origin iframe hands its parent no events at all, so a click
 | on the embed is not something this page can see — and a `window.open` fired
 | from something it inferred instead would be refused by every popup blocker
 | there is, because it would not carry a user gesture. A real link the visitor
 | really clicked carries one by construction, and is never blocked.
 |
 | The name is an `aria-label` rather than a visually-hidden span, and that is
 | not interchangeable here. A link is named by its contents, so a span would
 | be *appended to* the picture's alt text — the editor's words, which they are
 | entitled to write for the picture — and the link would be announced as "A
 | drawn map of the way to Plant 13 Open this location in Google Maps". The
 | label replaces the computed name outright, so the alt stays the picture's
 | and the link's name stays the same on both paths.
 |
 | It is also what makes the embed behave. The map below is drawn with
 | `pointer-events: none`, so every click, drag and wheel over it falls through
 | to this anchor instead — which is what disables panning and zooming, and
 | what stops the map eating the page's scroll as the visitor passes it.
 |
 */
function Opens_In_Maps (
	{ children, url }: {
		// Borrowed from `Nav_Link` rather than written as a `ReactNode`, for
		// the reason its own header sets out: React Router resolves a different
		// copy of `@types/react` than the website does, and a `ReactNode` from
		// here is not assignable to a `ReactNode` from there.
		children: ComponentProps<typeof Nav_Link>["children"]
		url: string
	},
) {
	return <Nav_Link
		aria-label={ OPEN_IN_MAPS }
		className="block"
		url={ url }
		target="_blank"
		rel="noreferrer">
		{ children }
	</Nav_Link>
}

/**
 |
 | The fallback, and the reason the image above exists.
 |
 | The keyless embed endpoint is used deliberately: the alternative wants an API
 | key, which is one more secret to hold for a picture of a street.
 |
 | It is fed a **coordinate**, never an address. `q=` with words in it is a
 | search, and a search is entitled to more than one result — which is a map
 | with several pins on it, only one of them the place the editor meant. A
 | coordinate is not a search and cannot come back with two of anything. The
 | pair is read out of the editor's URL once, when they save it, by the CMS's
 | `derive-map-coordinates` middleware; nothing is parsed here.
 |
 | `inert` rather than only the anchor over the top: `tabindex="-1"` keeps an
 | iframe out of the tab order but does not reliably keep focus out of the
 | document inside it, and this one has nothing anybody should reach.
 |
 */
function Embedded_Map (
	{ latitude, longitude, zoom }: Pick<
		Map_Attribute,
		"latitude" | "longitude" | "zoom"
	>,
) {
	if (
		typeof latitude !== "number" || typeof longitude !== "number"
	) {
		return null
	}

	const query = encodeURIComponent( `${latitude},${longitude}` )

	return <iframe
		inert
		className={ `${FRAME} border-0 pointer-events-none` }
		src={ `https://maps.google.com/maps?q=${query}&z=${
			zoom ?? 16
		}&output=embed` }
		title={ OPEN_IN_MAPS }
		loading="lazy"
		referrerPolicy="no-referrer-when-downgrade" />
}
