
import { configured_flag, environment_default } from "../src/this/environment"
import { upload_provider } from "../src/this/upload-provider"
import { get_website_urls } from "../src/this/website-urls"

/**
 |
 | Plugins.
 |
 | The Strapi Cloud plugin is deliberately not installed.
 |
 | There is no production counterpart to this file. The two things that used to
 | differ between environments — the upload provider and the sitemap addon — are
 | variables now, and the environment supplies only their defaults. See
 | src/this/environment.ts.
 |
 */

export default function ( { env } ) {
	return {
		"upload": {
			config: {
				...upload_config( env ),
				sizeLimit: 20 * 1024 * 1024,
				breakpoints: {
					xl: 1920,
					lg: 1080,
					md: 720,
					sm: 480,
					xs: 360,
					xxs: 120,
				},
			},
		},

		"webtools": {
			enabled: true,
			config: {
				default_pattern: "/[pluralName]/[documentId]",
				unique_per_locale: false,
				website_url: get_website_urls( env )[0],
			},
		},

		/**
		 |
		 | On in production and off elsewhere by default, and overridable in
		 | both directions: a staging site wants to prove the sitemap generates
		 | before production depends on it, and a production site that is not
		 | ready to be indexed — a soft launch, a broken generation — wants it
		 | off without a deploy.
		 |
		 */
		"webtools-addon-sitemap": {
			enabled: configured_flag(
				"SITEMAP_ENABLED",
				environment_default( true, false ),
			),
		},

		"color-picker": {
			enabled: true,
		},
	}
}

/**
 |
 | The S3 options are read with Strapi's `env()` rather than through
 | `src/this/environment.ts`, deliberately: they are values, not switches, and a
 | missing bucket name should surface as the provider failing rather than as a
 | default nobody chose.
 |
 */
function upload_config ( env ) {
	if ( upload_provider() === "aws-s3" ) {
		return {
			provider: "aws-s3",
			providerOptions: {
				baseUrl: env( "CDN_URL" ),
				s3Options: {
					region: env( "AWS_REGION" ),
					params: {
						Bucket: env( "AWS_BUCKET_NAME" ),
					},
				},
			},
		}
	}

	return {
		provider: "local",
		providerOptions: {
			localServer: {
				directory: "./public/uploads",
			},
		},
	}
}
