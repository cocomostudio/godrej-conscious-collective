
import path from "node:path"

/**
 |
 | Upload security.
 |
 | Two independent gates, both of which a file must pass:
 |
 |   • an **allow-list** of media MIME types — anything not named here is
 |     rejected, so a new format is a deliberate decision rather than an
 |     oversight; and
 |   • an explicit **deny-list** of executable types, checked against both the
 |     declared MIME type and the filename extension, because a client chooses
 |     its own MIME type and `application/octet-stream` would otherwise carry
 |     anything.
 |
 | The deny-list is redundant against the allow-list by construction. It is kept
 | because it states the intent, and because it survives somebody widening the
 | allow-list later.
 |
 */

const ALLOWED_MIME_TYPES = new Set( [
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/avif",
	"image/svg+xml",
	// Video
	"video/mp4",
	"video/webm",
	"video/quicktime",
	// Audio
	"audio/mpeg",
	"audio/ogg",
	"audio/wav",
	"audio/x-wav",
	"audio/mp4",
	// Documents — the schedule document is a PDF.
	"application/pdf",
] )

const DENIED_MIME_TYPES = new Set( [
	"application/x-msdownload",
	"application/x-msdos-program",
	"application/x-executable",
	"application/x-mach-binary",
	"application/x-elf",
	"application/x-dosexec",
	"application/vnd.microsoft.portable-executable",
	"application/x-sh",
	"application/x-shellscript",
	"application/x-csh",
	"application/x-bat",
	"application/javascript",
	"text/javascript",
	"application/x-httpd-php",
	"application/java-archive",
	"application/x-msi",
	"application/wasm",
] )

const DENIED_EXTENSIONS = new Set( [
	".exe",
	".dll",
	".so",
	".dylib",
	".app",
	".msi",
	".scr",
	".com",
	".bat",
	".cmd",
	".ps1",
	".sh",
	".bash",
	".zsh",
	".vbs",
	".jse",
	".wsf",
	".js",
	".mjs",
	".cjs",
	".wasm",
	".php",
	".phtml",
	".py",
	".rb",
	".pl",
	".cgi",
	".jar",
	".deb",
	".rpm",
	".htaccess",
] )

export default function upload_security () {
	return async function upload_security_middleware ( context, next ) {
		if ( !is_upload_request( context ) ) {
			return next()
		}

		for ( const file of collect_files( context.request?.files ) ) {
			const rejection = get_rejection( file )
			if ( rejection ) {
				return context.badRequest( rejection )
			}
		}

		return next()
	}
}

function is_upload_request ( context ) {
	return context.method === "POST"
		&& typeof context.path === "string"
		&& context.path.includes( "/upload" )
}

function collect_files ( files ) {
	if ( !files ) {
		return []
	}

	return Object.values( files ).flat().filter( Boolean )
}

function get_rejection ( file ) {
	const mime_type = ( file.mimetype ?? file.type ?? "" ).toLowerCase()
	const name = file.originalFilename ?? file.name ?? ""
	const extension = path.extname( name ).toLowerCase()

	if (
		DENIED_MIME_TYPES.has( mime_type )
		|| DENIED_EXTENSIONS.has( extension )
	) {
		return `"${name}" is an executable file type and cannot be uploaded.`
	}

	if ( !ALLOWED_MIME_TYPES.has( mime_type ) ) {
		return `"${name}" has the media type "${mime_type}", which is not on `
			+ `this application's allow-list of uploadable media types.`
	}

	return null
}
