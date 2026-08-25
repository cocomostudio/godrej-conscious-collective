
/**
 |
 | The one piece of media in this seed that is not a bare url.
 |
 | Every picture elsewhere is written as an address on somebody else's host,
 | because the image component carries a `url` beside its `file` for exactly
 | that reason and a fresh clone should need no binary assets. The schedule
 | cannot be: `Event.schedule` is a media attribute with no url sibling, so
 | something has to be *in* the media library for it to point at.
 |
 | The spec's rule for such media is what the uploader below does — write a
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
