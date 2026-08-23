
/**
 |
 | Which populate fragment answers for which content type.
 |
 | The envelope route resolves a path to a content type and then reaches for
 | the fragment here. A routable content type with no entry is a boot-time
 | mistake rather than a runtime one, so the route refuses to serve it rather
 | than quietly returning an unpopulated entry — which would look like empty
 | content, which is the failure this whole arrangement exists to prevent.
 |
 */

import { populate_page } from "./page/populate"

export const POPULATE_BY_CONTENT_TYPE: Record<string, object> = {
	"api::page.page": populate_page,
}
