
/**
 |
 | The website's origins, comma-separated in one environment variable.
 |
 | Three config files need them and would otherwise each carry their own copy of
 | the development default: webtools wants a single absolute base and takes the
 | first, the admin's Entry Preview allows the whole list as origins, and the
 | security middleware puts the whole list in `frame-src`.
 |
 | This lives under `src/this/` because that directory is inert — none of
 | Strapi's loaders read it, so a plain module here is not mistaken for a
 | content type, a component or a config namespace.
 |
 */

export function get_website_urls ( env ): string[] {
	return env.array( "WEBSITE_URLS", [ "http://localhost:9001" ] )
}
