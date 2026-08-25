
/**
 |
 | The two ways a picture is put on the page.
 |
 | Neither is a block. Both are used by several blocks — an image link wraps
 | one, a map falls back to one, a gallery holds two — and a block that happened
 | to render its own `<img>` would drift from the rest on the first change to
 | how a caption sits.
 |
 */

import type { Picture } from "./media.ts"

import {
	LARGE_FROM,
	MEDIUM_FROM,
} from "./media.ts"

/**
 |
 | One picture. `className` is the frame the caller wants around it — an aspect
 | ratio, a width — because that is what differs between a gallery plate, a
 | portrait and a logo.
 |
 */
export function Picture_Image (
	{ className = "", picture, sizes }: {
		className?: string
		picture: Picture
		sizes?: string
	},
) {
	return <img
		className={ className }
		src={ picture.src }
		srcSet={ picture.src_set }
		sizes={ picture.src_set ? sizes : undefined }
		alt={ picture.alt }
		decoding="async"
		loading="lazy" />
}

/**
 |
 | Three pictures, one per width, as a `<picture>`.
 |
 | This is art direction: the editor chose a different crop for a phone than for
 | a desktop, and the browser is told which is which rather than being left to
 | pick on file size. Within each of the three, the upload's own generated
 | widths still ride along in a `srcset`, which is the resolution half of the
 | same problem.
 |
 */
export function Responsive_Picture (
	{ className = "", pictures, sizes }: {
		className?: string
		pictures: { small: Picture; medium: Picture; large: Picture }
		sizes?: string
	},
) {
	const { large, medium, small } = pictures

	return <picture>
		{ LARGE_FROM && <source
			media={ `( min-width: ${LARGE_FROM}px )` }
			srcSet={ large.src_set ?? large.src }
			sizes={ large.src_set ? sizes : undefined }
		/> }
		{ MEDIUM_FROM && <source
			media={ `( min-width: ${MEDIUM_FROM}px )` }
			srcSet={ medium.src_set ?? medium.src }
			sizes={ medium.src_set ? sizes : undefined }
		/> }

		<Picture_Image
			className={ className }
			picture={ small }
			sizes={ sizes } />
	</picture>
}

/**
 |
 | The words under a picture: a title, then a smaller caption.
 |
 | Renders nothing at all when neither is filled in, so a decorative picture
 | does not carry an empty `<figcaption>` around.
 |
 */
export function Picture_Caption (
	{ className = "", picture }: { className?: string; picture: Picture },
) {
	if ( !picture.title && !picture.caption ) {
		return null
	}

	return <figcaption className={ `text-black ${className}` }>
		{ picture.title && <p className="text-p">{ picture.title }</p> }
		{ picture.caption
			&& <p className="mt-1 md:mt-2 text-caption">
				{ picture.caption }
			</p> }
	</figcaption>
}
