# `documents.strictParams` is off, so that authors can edit URLs

Status: accepted

`config.api.documents.strictParams` is **off in every environment**, reversing a requirement that originally asked for it on both `rest` and `documents`. `rest.strictParams` stays on. The reason is not performance or convenience: with `documents.strictParams` on, content authors cannot change a URL anywhere in the admin panel.

## Why the two are connected

Webtools generates a URL alias from a pattern, and an author overrides it by editing the alias and unchecking automatic generation. That override is writable from exactly one place — the plugin's Content-Manager side panel. The plugin's All URLs page cannot substitute: its rows are read-only, its bulk-select interface is commented out, and its edit affordance deep-links back to the same side panel.

That side panel sends the literal string `"null"` as a locale, because it reads a locale from search params that i18n never sets and interpolates the resulting `null` into a template string. i18n is off in this project, so this happens on every entry. Strapi's locale format check rejects `"null"` — **but only when `documents.strictParams` is true**. The panel swallows the error and returns nothing, so it does not fail loudly; it simply is not there.

So the choice is genuinely binary. `strictParams` on means generated URLs are permanent and unchangeable by any editor, in production included.

## Considered options

**Keep `strictParams` on and accept unchangeable URLs.** Rejected — authors renaming or reorganising pages is ordinary work, and a CMS that cannot change a URL is failing at something basic.

**Turn it off in production only**, where authors work. Rejected — a behaviour that exists only in production is a behaviour nobody tests, and this one governs a writable admin path.

**Ship a bespoke escape hatch** — a CLI command or env-gated bootstrap step writing the override directly. Rejected as a tool built to work around our own configuration, usable only by someone with shell access, which authors are not.

## Consequences

The protection `strictParams` would have given is not simply surrendered. What it was guarding is one specific public route: webtools' own resolver destructures `path` off the query string and spreads **everything else** straight into a document-service call, so arbitrary parameters reach the document service from an unauthenticated endpoint. The frontend does not use that route — it uses this project's own populate route — so a policy rejects public requests to it outright. That closes the surface completely rather than partially, which `strictParams` alone did not.

Turning `strictParams` back on later silently removes an author capability rather than breaking a build. Anyone considering it should know that the symptom will be reported as "the URL field disappeared", with nothing in the logs.

Two related hazards, recorded here because they share the same blast radius and are documented nowhere else. The **"Re-generate all URL aliases"** bulk action deletes and recreates every alias for a content type with no predicate on the manual flag and no warning in its dialog, destroying every override. And webtools' schema-sync hook deletes every alias for a content type whenever its plugin setting is absent — firing at boot on any schema difference, so it cannot distinguish a deliberate change from a bad merge. Neither is recoverable except by reseeding or restoring the database.
