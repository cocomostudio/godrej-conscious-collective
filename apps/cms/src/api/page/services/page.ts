
/**
 |
 | Page service.
 |
 | Required rather than decorative: Strapi does not synthesise one, and the core
 | controller reaches for `strapi.service( "api::page.page" )` on every request
 | it handles.
 |
 */

import { factories } from "@strapi/strapi"

export default factories.createCoreService( "api::page.page" )
