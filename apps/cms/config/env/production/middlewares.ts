
/**
 |
 | Production-only middleware configuration.
 |
 | Uploads are served from S3 through a CDN in production, so the media
 | directives have to name those hosts or the admin's own previews break.
 |
 | Strapi deep-merges this over `config/middlewares.ts`. The middleware list is
 | an array, so this file restates it — a merge would splice by index.
 |
 */

import base_middlewares from "../../middlewares"

export default function ( { env } ) {
	const media_sources = [
		"'self'",
		"data:",
		"blob:",
		`${env( "AWS_BUCKET_NAME" )}.s3.${env( "AWS_REGION" )}.amazonaws.com`,
		env( "CDN_URL" ),
	].filter( Boolean )

	return base_middlewares( { env } ).map( ( middleware ) => {
		if (
			typeof middleware !== "object"
			|| middleware.name !== "strapi::security"
		) {
			return middleware
		}

		return {
			...middleware,
			config: {
				...middleware.config,
				contentSecurityPolicy: {
					...middleware.config.contentSecurityPolicy,
					directives: {
						...middleware.config.contentSecurityPolicy
							.directives,
						"img-src": media_sources,
						"media-src": media_sources,
					},
				},
			},
		}
	} )
}
