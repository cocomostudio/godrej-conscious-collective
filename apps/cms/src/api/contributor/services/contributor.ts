
/**
 |
 | Contributor service.
 |
 | Required rather than decorative: Strapi does not synthesise one, and the
 | core controller reaches for `strapi.service( "api::contributor.contributor" )`
 | on every request it handles.
 |
 */

import { factories } from "@strapi/strapi"

export default factories.createCoreService( "api::contributor.contributor" )
