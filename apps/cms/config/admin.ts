
import { get_website_urls } from "../src/this/website-urls"

/**
 |
 | Admin panel.
 |
 | Marketing and telemetry are off: the NPS survey, the enterprise promotion and
 | the documentation links are all disabled here, and telemetry is disabled in
 | this package's manifest.
 |
 */

export default function ( { env } ) {
	return {
		auth: {
			secret: env( "ADMIN_JWT_SECRET" ),
		},
		apiToken: {
			salt: env( "API_TOKEN_SALT" ),
		},
		transfer: {
			token: {
				salt: env( "TRANSFER_TOKEN_SALT" ),
			},
		},
		secrets: {
			encryptionKey: env( "ENCRYPTION_KEY" ),
		},
		flags: {
			nps: false,
			promoteEE: false,
			docLinks: false,
		},
		autoOpen: false,
		preview: {
			enabled: true,
			config: {
				allowedOrigins: get_website_urls( env ),
				async handler ( uid, { documentId, status } ) {
					if ( !uid || !status ) {
						return null
					}

					const document = await strapi.documents( uid ).findOne(
						{
							documentId,
							status,
							populate: [ "url_alias" ],
						},
					)

					const url_path = document?.url_alias?.[0]?.url_path
					if ( !url_path ) {
						return null
					}

					const [ website_url ] = get_website_urls( env )

					return `${website_url}${url_path}?status=${status}`
				},
			},
		},
	}
}
