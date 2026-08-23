# Contributor has no draft and publish

Contributor is publishable and has a page of its own, yet Draft & Publish is **off** for it — unlike Page and Session, which keep it on. Session relates to Contributor as a manyToMany, and in Strapi 5 a relation between two Draft & Publish types links individual *versions* rather than documents, which breaks two ways at once. Publishing a session re-resolves every related contributor to that contributor's published row and passes `allowMissingId: true`, so drafted contributors are dropped with nothing logged and the live session page lists none of them. And `Contributor.events`, which a middleware derives, could never be kept correct: published versions are read-only, so a middleware can only ever write the draft, leaving the published contributor holding a stale event set until somebody republished it by hand. With the feature off, Strapi resolves the relation to the single stored row every time.

Verified in `@strapi/core@5.52.1` — `services/document-service/transform/relations/transform/data-ids.js`, `entries.js`, `repository.js`, `draft-and-publish.js`.

## Consequences

A contributor is live at its URL the moment an editor creates it. An unannounced collaborator is still absent from listings, though: `Contributor.events` derives from **published** sessions only, so a contributor whose sessions are all drafts belongs to no event and nothing on the site links to their page.

Turning Draft & Publish back on later means publishing every existing contributor, and both failures return.
