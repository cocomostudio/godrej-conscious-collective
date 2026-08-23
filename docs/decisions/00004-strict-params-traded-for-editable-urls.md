# `documents.strictParams` is off, so that authors can edit URLs

`config.api.documents.strictParams` is **off in every environment**, reversing a requirement that originally asked for it on both `rest` and `documents`; `rest.strictParams` stays on. The reason is not performance or convenience: with `documents.strictParams` on, content authors cannot change a URL anywhere in the admin panel.

Webtools' Content-Manager side panel is the only writable place an author can override a generated alias — the All URLs page is read-only and deep-links back to it. That panel sends the literal string `"null"` as a locale, because it reads a locale from search params that i18n never sets, and Strapi's locale format check rejects `"null"` **only when `documents.strictParams` is true**. The panel swallows the error and returns nothing, so the capability does not fail loudly; it simply is not there. The choice is therefore binary: `strictParams` on means generated URLs are permanent and unchangeable by any editor, production included.

Turning it off in production only was rejected — a behaviour that exists only in production is a behaviour nobody tests, and this one governs a writable admin path. So was a bespoke CLI escape hatch, usable only by someone with shell access, which authors are not.

## Consequences

The protection is not simply surrendered. What `strictParams` guarded here is one public route: webtools' own resolver destructures `path` off the query string and spreads everything else straight into a document-service call. The frontend uses this project's own populate route instead, so a policy rejects public requests to webtools' resolver outright — closing the surface completely rather than partially, which `strictParams` alone did not.

Turning `strictParams` back on later removes an author capability silently rather than breaking a build. The symptom will be reported as "the URL field disappeared", with nothing in the logs.

Two related hazards, recorded here because they share the same blast radius and are documented nowhere else. The **"Re-generate all URL aliases"** bulk action deletes and recreates every alias for a content type with no predicate on the manual flag and no warning in its dialog, destroying every override. And webtools' schema-sync hook deletes every alias for a content type whenever its plugin setting is absent — firing at boot on any schema difference, so it cannot distinguish a deliberate change from a bad merge. Neither is recoverable except by reseeding or restoring the database.
