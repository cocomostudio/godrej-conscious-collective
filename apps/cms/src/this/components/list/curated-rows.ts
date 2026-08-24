
/**
 |
 | What a **curated** listing's relation is populated with, which is nothing but
 | identity and order.
 |
 | **A listing never travels with its rows.** The rows are fetched afterwards,
 | by `src/this/api/listings.ts`, and spliced into the component's node before
 | the response goes out. That is one query per listing rather than a populate
 | branch, and it is not a preference:
 |
 |   • An **auto-populated** listing holds a category and a count, not rows. No
 |     populate branch can express "the next six Showcases belonging to this
 |     page's event", so the query has to be made somewhere.
 |
 |   • A **curated** listing could be populated in place — and then it would
 |     arrive shaped differently from its auto-populated sibling: narrowed by a
 |     different object, capped in a different place, and missing the one thing
 |     no populate branch can hand over, which is the row's own URL. Two shapes
 |     is two code paths in every block that renders a listing.
 |
 | So both go the same way, and the CMS has one narrowing, one cap and one place
 | where a listing's rows are decided.
 |
 | Strapi hands an ordered relation back in the editor's own drag order, and
 | that order is the whole of what the curated case adds over the automatic one.
 |
 | It lives beside the fragments rather than inside one of them because two
 | listings share it, exactly as the inner list sits beside the composites that
 | share that.
 |
 */

export const CURATED_ROWS = { fields: [ "documentId" ] }
