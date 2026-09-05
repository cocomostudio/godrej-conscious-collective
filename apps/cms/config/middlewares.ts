
import { upload_provider } from "../src/this/upload-provider"
import { get_website_urls } from "../src/this/website-urls"

/**
 |
 | `frame-src` has to name the website's origins, or Entry Preview is configured
 | but cannot work: the admin renders the preview in an iframe, and helmet's
 | default `frame-src` is `'self'`.
 |
 | There is no production counterpart to this file. The media directives follow
 | the upload provider rather than the environment — see `media_directives`.
 |
 */

export default function ( { env } ) {
	return [
		"strapi::logger",
		"strapi::errors",
		{
			name: "strapi::security",
			config: {
				contentSecurityPolicy: {
					useDefaults: true,
					directives: {
						"frame-src": [
							"'self'",
							...get_website_urls( env ),
						],
						...media_directives( env ),
					},
				},
			},
		},
		"strapi::cors",
		"strapi::poweredBy",
		"strapi::query",
		{
			name: "strapi::body",
			config: {
				formLimit: "20mb",
				jsonLimit: "20mb",
				textLimit: "20mb",
				formidable: {
					maxFileSize: 20 * 1024 * 1024,
				},
			},
		},
		"global::upload-security",
		// ↑ Must sit after `strapi::body`, which is what parses the multipart
		// 	request into `ctx.request.files`.
		"strapi::session",
		"strapi::favicon",
		"strapi::public",
	]
}

/**
 |
 | The hosts uploads are served from, when that is not this origin.
 |
 | Keyed on the upload provider and **not** on the environment, because it is
 | the provider that decides where a picture's URL points. An instance pointed
 | at S3 whose CSP still described local uploads would block its own images in
 | the admin, which is exactly the configuration somebody reaches for when they
 | are trying to test S3 before production depends on it.
 |
 | Nothing is added for the local provider: uploads are then same-origin, which
 | helmet's defaults already allow.
 |
 */
function media_directives ( env ) {
	if ( upload_provider() !== "aws-s3" ) {
		return {}
	}

	const media_sources = [
		"'self'",
		"data:",
		"blob:",
		`${env( "AWS_BUCKET_NAME" )}.s3.${env( "AWS_REGION" )}.amazonaws.com`,
		env( "CDN_URL" ),
	].filter( Boolean )

	return {
		"img-src": media_sources,
		"media-src": media_sources,
	}
}
