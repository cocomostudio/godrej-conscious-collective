
import { get_website_urls } from "../src/this/website-urls"

/**
 |
 | `frame-src` has to name the website's origins, or Entry Preview is configured
 | but cannot work: the admin renders the preview in an iframe, and helmet's
 | default `frame-src` is `'self'`.
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
