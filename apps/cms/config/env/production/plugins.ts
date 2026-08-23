
/**
 |
 | Production-only plugin configuration.
 |
 | Strapi deep-merges this over `config/plugins.ts`, so only the differences
 | belong here: the S3 upload provider, and the sitemap addon.
 |
 */

export default function ( { env } ) {
	return {
		"upload": {
			config: {
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
			},
		},

		"webtools-addon-sitemap": {
			enabled: true,
		},
	}
}
