
/**
 |
 | The two pieces of media in this seed that are not bare urls.
 |
 | Every picture elsewhere is written as an address on somebody else's host,
 | because the image component carries a `url` beside its `file` for exactly
 | that reason and a fresh clone should need no binary assets. These two
 | cannot: `Event.schedule` and `Page_Shell.form_slideshow` are media
 | attributes with no url sibling, so something has to be *in* the media
 | library for them to point at.
 |
 | The spec's rule for such media is what both functions below do — write a
 | temporary file, upload it, and delete the temporary copy once the upload has
 | succeeded.
 |
 */

import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import type { Strapi } from "./strapi.ts"

/**
 |
 | The schedule document, uploaded rather than linked.
 |
 | It is the one piece of media in this seed that is not a bare url, and it has
 | to be: `Event.schedule` is a media attribute with no url sibling beside it,
 | because a schedule is a file an organiser hands over rather than a picture
 | hosted somewhere else. The spec's rule for such media is a temporary file,
 | uploaded, and deleted once the upload has succeeded, which is what this does.
 |
 | The PDF is **written here rather than downloaded**. The seed makes no network
 | calls at all today and the CMS test harness runs it on every boot, so a fetch
 | would put someone else's uptime between this project and its own test suite.
 | What is written is a valid single-page PDF carrying the event's name — enough
 | that a browser opens it, which is the whole of what the download link claims.
 | Its one line of text is deliberately ASCII: the file is assembled as bytes
 | and its cross-reference table holds byte offsets, so a character that is one
 | byte in one encoding and three in another would put every offset out.
 |
 */
export async function upload_schedule_document (
	strapi: Strapi,
	filename: string,
	title: string,
) {
	const directory = await fs.mkdtemp(
		path.join( os.tmpdir(), "conscious-collective-seed-" ),
	)
	const file = path.join( directory, filename )

	try {
		const pdf = one_page_pdf( `${title} - schedule` )
		await fs.writeFile( file, pdf )

		const [ uploaded ] = await strapi
			.plugin( "upload" )
			.service( "upload" )
			.upload( {
				data: {},
				files: {
					filepath: file,
					mimetype: "application/pdf",
					originalFilename: filename,
					size: pdf.length,
				},
			} )

		return uploaded.id
	} finally {
		await fs.rm( directory, { force: true, recursive: true } )
	}
}

/**
 |
 | The pictures that cycle beside the registration form.
 |
 | `Page_Shell.form_slideshow` is a media attribute with no url sibling — an
 | editor picks these from the media library — so unlike every picture in this
 | seed they cannot be a bare address. The spec's rule for such media is the one
 | the schedule document follows: a temporary file, uploaded, and the temporary
 | copy deleted once the upload has succeeded. No image is stored in this
 | repository either way.
 |
 | ─── THE NETWORK CALL, AND WHY IT IS ALLOWED TO FAIL ────────────────────────
 |
 | Unlike the schedule document, these cannot be synthesised: a generated
 | rectangle beside a registration form is worse than no picture at all, and the
 | five below are the five the static site shows. So this is the one place the
 | seed reaches out to the network, and the note on `upload_schedule_document`
 | is the reason it must not be allowed to matter: the CMS test harness runs
 | this seed on every boot, and a fetch that could fail the seed would put
 | somebody else's uptime between this project and its own test suite.
 |
 | A slide that will not download is therefore **skipped, with a line in the
 | log**. A seed with no network at all produces a shell with no slideshow, and
 | the registration dialog draws itself one column wide — which is a shape the
 | frontend already has, because an editor who uploads nothing gets the same
 | thing.
 |
 | The timeout is short for the same reason. A seed is run several times a day
 | and must not sit waiting on a host that is not answering.
 |
 | The captions are invented, borrowed from real event names so they read
 | coherently. The third slide deliberately has none: captions are optional and
 | the layout needs to be exercised without one.
 |
 */
const SLIDESHOW_TIMEOUT_MS = 8000

const SLIDESHOW = [
	{
		alt: "",
		caption: "Flower Pressing, Andy Peacewol, MoMA",
		filename: "registration-slide-one.jpg",
		url: "https://images.unsplash.com/photo-1748803798842-f179b4b61c90?q=80&w=720&auto=format&fit=crop",
	},
	{
		alt: "A gathering at dusk, seen from above",
		filename: "registration-slide-two.jpg",
		url: "https://images.unsplash.com/photo-1767286795458-32a88bdefbe5?q=80&w=720&auto=format&fit=crop",
	},
	{
		alt: "",
		caption:
			"Speed of Sound, captured at a shutter speed of 1/180,000 of a "
			+ "second, with a cold camera, 2005",
		filename: "registration-slide-three.jpg",
		url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=720&auto=format&fit=crop",
	},
	{
		alt: "",
		caption:
			"Buildings colored in ice-cream flavors, has been found to draw "
			+ "people towards them.",
		filename: "registration-slide-four.jpg",
		url: "https://plus.unsplash.com/premium_photo-1710871398930-c2967d93196f?q=80&w=720&auto=format&fit=crop",
	},
	{
		alt: "",
		caption: "Godrej Design Lab Headquarters, Mumbattan",
		filename: "registration-slide-five.jpg",
		url: "https://images.unsplash.com/photo-1683062409353-28e0515dcc0e?q=80&w=720&auto=format&fit=crop",
	},
]

export async function upload_slideshow ( strapi: Strapi ) {
	const directory = await fs.mkdtemp(
		path.join( os.tmpdir(), "conscious-collective-slideshow-" ),
	)

	const uploaded: number[] = []

	try {
		for ( const slide of SLIDESHOW ) {
			const id = await upload_slide( strapi, directory, slide )

			if ( id !== null ) {
				uploaded.push( id )
			}
		}
	} finally {
		await fs.rm( directory, { force: true, recursive: true } )
	}

	if ( uploaded.length < SLIDESHOW.length ) {
		console.warn(
			`\n${SLIDESHOW.length - uploaded.length} of ${SLIDESHOW.length} `
				+ `registration slideshow pictures could not be downloaded. The `
				+ `registration form will show the ones that were, or none at `
				+ `all — which is the same thing an editor who uploads nothing `
				+ `gets.\n`,
		)
	}

	return uploaded
}

async function upload_slide (
	strapi: Strapi,
	directory: string,
	slide: typeof SLIDESHOW[number],
) {
	try {
		const response = await fetch( slide.url, {
			signal: AbortSignal.timeout( SLIDESHOW_TIMEOUT_MS ),
		} )

		if ( !response.ok ) {
			return null
		}

		const bytes = Buffer.from( await response.arrayBuffer() )
		const file = path.join( directory, slide.filename )

		await fs.writeFile( file, bytes )

		const [ stored ] = await strapi
			.plugin( "upload" )
			.service( "upload" )
			.upload( {
				data: {
					fileInfo: {
						alternativeText: slide.alt,
						caption: slide.caption ?? null,
					},
				},
				files: {
					filepath: file,
					mimetype: "image/jpeg",
					originalFilename: slide.filename,
					size: bytes.length,
				},
			} )

		return stored.id as number
	} catch {
		return null
	}
}

/**
 |
 | A one-page PDF holding a single line of text, built by hand.
 |
 | Four objects, a cross-reference table and a trailer, which is the smallest
 | thing a PDF reader will open. The offsets in the table have to be the byte
 | positions of the objects, so the body is assembled first and measured rather
 | than written with the numbers guessed.
 |
 */
function one_page_pdf ( line: string ): Buffer {
	const escaped = line.replace( /([\\()])/g, "\\$1" )
	const stream = `BT /F1 24 Tf 72 720 Td (${escaped}) Tj ET`

	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] "
		+ "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
	]

	let body = "%PDF-1.4\n"
	const offsets: number[] = []

	objects.forEach( ( object, index ) => {
		offsets.push( Buffer.byteLength( body ) )
		body += `${index + 1} 0 obj\n${object}\nendobj\n`
	} )

	const start_of_table = Buffer.byteLength( body )
	const table = [
		"xref",
		`0 ${objects.length + 1}`,
		"0000000000 65535 f ",
		...offsets.map( ( offset ) =>
			`${String( offset ).padStart( 10, "0" )} 00000 n `
		),
		"trailer",
		`<< /Size ${objects.length + 1} /Root 1 0 R >>`,
		"startxref",
		String( start_of_table ),
		"%%EOF",
	].join( "\n" )

	return Buffer.from( `${body}${table}\n`, "latin1" )
}
