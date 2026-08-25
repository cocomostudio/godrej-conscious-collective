
/**
 |
 | Turning what the CMS holds for a picture into what an `<img>` needs.
 |
 | Two shapes arrive. An **image** is one picture with the words that go with
 | it, and it may carry either an uploaded file or a bare `url` — the seed
 | script uses the second so that no image is stored in this repository. A
 | **responsive image** is three of those, one per width, and that is art
 | direction rather than resolution: the upload's own breakpoints already fill
 | a `srcset` within each one, and the two are complementary.
 |
 | Both answer `null` when there is nothing to show, so a block can decide to
 | render nothing rather than an empty frame.
 |
 */

import type { Media } from "./envelope.ts"

export type Image_Attribute = {
	file?: Media | null
	url?: string | null
	title?: string | null
	caption?: string | null
	alt?: string | null
}

export type Responsive_Image_Attribute = {
	small?: Image_Attribute | null
	medium?: Image_Attribute | null
	large?: Image_Attribute | null
}

export type Picture = {
	src: string
	/** Absent when the picture came from a bare url and has no upload behind it. */
	src_set?: string
	alt: string
	title: string | null
	caption: string | null
}

/**
 |
 | The two widths the design changes at. The small picture covers everything
 | below the first.
 |
 */
export const MEDIUM_FROM = 1024
export const LARGE_FROM = 1440

export function picture_of (
	image: Image_Attribute | null | undefined,
	origin: string,
): Picture | null {
	if ( !image ) {
		return null
	}

	const src = media_url( image.file?.url ?? image.url, origin )

	if ( !src ) {
		return null
	}

	return {
		// An empty string is the correct alt for decoration, and it is also
		// what an editor leaving the field alone means. A missing attribute
		// would make a screen reader read the file name out instead.
		alt: image.alt ?? "",
		caption: image.caption ?? null,
		src,
		src_set: src_set_of( image.file, origin ),
		title: image.title ?? null,
	}
}

/**
 |
 | The three widths, each already resolved, with the gaps filled in.
 |
 | An editor who fills in only one of the three means that one at every width,
 | which is the common case — art direction is the exception. So each width
 | falls back to the nearest one that was filled in, and a responsive image with
 | nothing in it at all answers `null`.
 |
 */
export function responsive_picture_of (
	responsive: Responsive_Image_Attribute | null | undefined,
	origin: string,
): { small: Picture; medium: Picture; large: Picture } | null {
	if ( !responsive ) {
		return null
	}

	const small = picture_of( responsive.small, origin )
	const medium = picture_of( responsive.medium, origin )
	const large = picture_of( responsive.large, origin )

	const any = small ?? medium ?? large

	if ( !any ) {
		return null
	}

	return {
		large: large ?? medium ?? small ?? any,
		medium: medium ?? small ?? large ?? any,
		small: small ?? medium ?? large ?? any,
	}
}

/**
 |
 | Strapi's upload plugin writes a relative path for anything it stores itself,
 | so the CMS's origin has to be put back in front of it. Anything already
 | absolute — an editor pasting an address, or a remote upload provider — is
 | left exactly as it arrived.
 |
 */
/**
 |
 | A stored file's URL, resolved against the CMS's origin.
 |
 | Strapi's own upload provider writes a relative path and the website is a
 | different origin, so something has to put the CMS's back in front of it — and
 | anything that already carries a scheme, or is protocol-relative, is left
 | alone.
 |
 | Exported because not every file the CMS holds is a picture: the schedule
 | document is a PDF behind a download link, and it is served from the same
 | place under the same rule. A second copy of that rule would be a second
 | answer to what `//host/file.pdf` means.
 |
 */
export function media_url (
	url: string | null | undefined,
	origin: string,
): string | null {
	if ( !url ) {
		return null
	}

	if ( /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test( url ) ) {
		return url
	}

	return `${origin.replace( /\/$/, "" )}${
		url.startsWith( "/" ) ? "" : "/"
	}${url}`
}

/**
 |
 | The upload's own generated widths, as a `srcset`.
 |
 | Only for a file the CMS holds. A bare url has no formats behind it, and
 | emitting a one-entry `srcset` identical to the `src` is a known way to hang a
 | browser.
 |
 */
function src_set_of (
	file: Media | null | undefined,
	origin: string,
): string | undefined {
	const formats = file?.formats as
		| Record<string, { url?: string; width?: number }>
		| undefined

	if ( !formats ) {
		return undefined
	}

	const entries = Object.values( formats )
		.map( ( format ) => ( {
			url: media_url( format?.url, origin ),
			width: format?.width,
		} ) )
		.filter( ( entry ) => entry.url && entry.width )
		.map( ( entry ) => `${entry.url} ${entry.width}w` )

	return entries.length > 0 ? entries.join( ", " ) : undefined
}
