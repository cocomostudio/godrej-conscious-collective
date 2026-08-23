# Contributor has no draft and publish

Status: accepted

Contributor is a publishable content type with a page of its own, yet Draft & Publish is turned **off** for it. Every other publishable type in this model — Page and Session — keeps Draft & Publish on. The reason is that Session relates to Contributor as a manyToMany, and in Strapi 5 a relation between two Draft & Publish types links individual *versions* rather than documents. Turning the feature off for Contributor removes an entire class of failure rather than one instance of it.

## The two failures this avoids

**Publishing a session would silently drop unpublished contributors.** Strapi's publish path re-resolves every related contributor to that contributor's published row, and passes `allowMissingId: true`, so a contributor with no published version is skipped without an error. An editor who drafts twelve collaborators, attaches them to a session and publishes the session would get a live session page listing no collaborators at all, with nothing logged. Verified in `@strapi/core@5.52.1`, `services/document-service/transform/relations/transform/data-ids.js` and `entries.js`.

**The derived `events` field could not be kept correct.** `Contributor.events` is maintained by a middleware rather than by an editor. Published versions in Strapi 5 are read-only: an `update()` carrying `status: 'published'` forces the status back to draft, writes the draft, then deletes and recreates the published row. So a middleware can only ever write the draft, and the published contributor would hold a stale event set until somebody republished that contributor by hand. Verified in `services/document-service/repository.js` and `draft-and-publish.js`.

With Draft & Publish off, Strapi resolves the relation to the single stored row every time, so a draft session and a published session both link to the same contributor.

## Consequences

A contributor entry is live at its URL from the moment an editor creates it, because there is no unpublished state to hold it back.

An unannounced collaborator still appears in no listing. `Contributor.events` is derived from **published** sessions only, so a contributor whose sessions are all drafts belongs to no event and is therefore absent from every event-filtered listing. Only the contributor's direct URL exists, and nothing on the site links to it.

Turning Draft & Publish back on later is expensive. Every existing contributor would need publishing, and both failures above would return.
