
/**
 |
 | Page router.
 |
 | The website never calls these routes — it reads a whole page from the
 | envelope route instead. They exist because the permission grid is derived
 | from routes: without a route composing onto `find`, no
 | `api::page.page.find` permission exists for the envelope route to check,
 | and none appears in the admin for an operator to grant.
 |
 */

import { factories } from "@strapi/strapi"

export default factories.createCoreRouter( "api::page.page" )
