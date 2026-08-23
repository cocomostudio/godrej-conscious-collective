# Webtools URL aliases — before you touch them

Every public URL on this site is a row in webtools' `url-alias` table. Those rows are the only
record of an author's manual URL, the plugin keeps no history of them, and several ordinary-looking
actions destroy or move them without warning.

Read part 1 before editing content. Read part 2 before clicking anything in the plugin's admin
screens or approving a schema diff.

## 1. Editing hazards — these fire during ordinary work

### A draft and its published version share one URL row

The `url-alias` content type is itself `draftAndPublish: false`, and an alias links every row
sharing a document's id — the draft and the published version alike. Three consequences:

- **Editing a draft's slug moves the live URL immediately.** There is no staged URL change. The
  public site follows the draft the moment it is saved, before anyone publishes anything.
- **Unpublishing does not release the URL.** The alias row stays where it is.
- **An unpublished document already holds its eventual public URL**, from creation.

Maintainer-confirmed as inherent to the design; the fix is deferred upstream as breaking.

### There are no redirects, so a rename is a silent 404

Redirect handling is a paid webtools addon that has not been bought. Combined with the above, an
editor renaming a session in a draft produces an immediately-live 404 at the old URL, and every
hand-typed internal link pointing there breaks with nothing logged and nothing to catch it.

**Before renaming anything that has been linked or shared, decide whether the old URL still needs
to work.** Nothing in the CMS will make that decision visible to you afterwards.

### Re-checking "generate automatically" discards the manual URL on the spot

The checkbox is the intended undo, but it is not a preview. Re-checking it sends `generated: true`,
which fires the regeneration branch immediately and recomputes `url_path` from the pattern — a
manual `/` becomes `/home` before the panel closes. There is no confirmation and no way back other
than retyping the override.

## 2. Destructive admin actions — rare, unrecoverable

### Never pick "Re-generate all URL aliases"

On the All URLs page, "Bulk generate" offers three radio options of apparently equal weight. The
third is destructive.

| Option | Deletes | Safe? |
|---|---|---|
| Generate only for pages without an URL alias | nothing | yes |
| Re-generate only URL alias that were auto-generated | `WHERE contenttype = ? AND generated = true` | yes — manual rows are kept |
| **Re-generate all URL aliases** | `WHERE contenttype = ?`, no `generated` predicate | **no — destroys every override** |

The delete is a raw `strapi.db.query(...).deleteMany()` inside a transaction. There is no
confirmation beyond the modal itself, no way to exclude a row, and nothing in the dialog says one
of the three options behaves differently from the others.

**Use the second option instead.** It does everything the third one is usually wanted for.

### Guard `pluginOptions.webtools.enabled` in schema files

Webtools registers a `strapi::content-types.beforeSync` hook that deletes every alias for a content
type whose previous schema had `pluginOptions.webtools.enabled` and whose current schema does not.

The trap is that the hook tests the schema, not your intent, and fires **at boot** whenever the
schema on disk differs from the stored one. A deliberate toggle-off in the Content-Type Builder, a
bad merge that drops the key from `src/api/*/content-types/*/schema.json`, a branch switch, and a
deploy of an older schema all look identical to it. The deletion lands on the restart after the
change, not at the moment of the change.

It runs at the database layer, bypassing the document service, so no middleware runs, no lifecycle
events fire, and there is no soft-delete or trash.

**Treat `pluginOptions.webtools.enabled` as load-bearing in code review.** A diff that removes it
is a data-loss diff.

## If aliases have already been lost

There is no undo. Restore the database, or reseed and have authors re-enter their overrides.

## Standing risk

Webtools' CI has never run past Strapi 5.42.1 — nineteen stable releases behind the 5.52.1 this
project pins — on SQLite only, with Postgres never exercised upstream. Bus factor is one, and
nothing has been published in roughly three months. Assume none of the above gets fixed upstream,
and re-test the alias paths after any Strapi upgrade.

## Source

Verified against `strapi-plugin-webtools` — `server/controllers/url-alias.ts`,
`server/hooks/disable.ts`, `server/register.ts`, and the alias middleware. Full quoted source and
the surrounding survey are in
`__this-project/build-plans/2026-08-23__cms-and-frontend/assets/webtools-facts.md`.
