
import { get_website_urls } from "../src/this/website-urls"

/**
 |
 | Plugins.
 |
 | The Strapi Cloud plugin is deliberately not installed.
 |
 | The sitemap addon is disabled here and enabled on the production environment
 | only — see config/env/production/plugins.ts.
 |
 */

export default function ( { env } ) {
	return {
		"upload": {
			config: {
				provider: "local",
				providerOptions: {
					localServer: {
						directory: "./public/uploads",
					},
				},
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

		"webtools-addon-sitemap": {
			enabled: false,
		},

		"color-picker": {
			enabled: true,
		},
	}
}
