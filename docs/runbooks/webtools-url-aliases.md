# Webtools URL aliases — before you touch them

Two ordinary-looking actions delete every URL alias for a content type. Neither warns you, neither
is logged, and neither is recoverable except by reseeding or restoring the database. Aliases carry
authors' manual URL overrides, so what is lost is editorial work, not derived data.

## 1. Never pick "Re-generate all URL aliases"

On the plugin's All URLs page, "Bulk generate" offers three radio options of apparently equal
weight. The third is destructive.

| Option | Deletes | Safe? |
|---|---|---|
| Generate only for pages without an URL alias | nothing | yes |
| Re-generate only URL alias that were auto-generated | `WHERE contenttype = ? AND generated = true` | yes — manual rows are kept |
| **Re-generate all URL aliases** | `WHERE contenttype = ?`, no `generated` predicate | **no — destroys every override** |

The delete is a raw `strapi.db.query(...).deleteMany()` inside a transaction. There is no
confirmation beyond the modal itself, no way to exclude a row, and nothing in the dialog says one
of the three options behaves differently from the others. Rows deleted this way are regenerated
from the pattern, so a page whose author had set `/` comes back as `/home`.

**Use the second option instead.** It does everything the third one is usually wanted for.

## 2. Guard `pluginOptions.webtools.enabled` in schema files

Webtools registers a `strapi::content-types.beforeSync` hook that deletes every alias for a
content type whose previous schema had `pluginOptions.webtools.enabled` and whose current schema
does not.

The trap is that the hook tests the schema, not your intent, and fires **at boot** whenever the
schema on disk differs from the stored one. A deliberate toggle-off in the Content-Type Builder, a
bad merge that drops the key from `src/api/*/content-types/*/schema.json`, a branch switch, and a
deploy of an older schema all look identical to it. The deletion lands on the restart after the
change, not at the moment of the change.

It runs at the database layer, bypassing the document service, so no middleware runs, no lifecycle
events fire, and there is no soft-delete or trash.

**Treat `pluginOptions.webtools.enabled` as load-bearing in code review.** A diff that removes it
is a data-loss diff.

## If it has already happened

There is no undo. Restore the database, or reseed and have authors re-enter their overrides.
Aliases are the only record of a manual URL, and the plugin keeps no history of them.

## Source

Verified against `strapi-plugin-webtools` — `server/controllers/url-alias.ts`,
`server/hooks/disable.ts`, `server/register.ts`. Full quoted source and the surrounding survey are
in `__this-project/build-plans/2026-08-23__cms-and-frontend/assets/webtools-facts.md`.
