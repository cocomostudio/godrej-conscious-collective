
/**
 |
 | Contributor controller.
 |
 | Nothing is overridden here and nothing is meant to be — the website reads a
 | contributor from the envelope route, not from this one. It exists because the
 | router beside it needs a controller method to compose onto, and that
 | composition is what puts `api::contributor.contributor.find` in the
 | permission grid.
 |
 */

import { factories } from "@strapi/strapi"

export default factories.createCoreController( "api::contributor.contributor" )
