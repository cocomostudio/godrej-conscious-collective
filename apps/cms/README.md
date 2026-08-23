# app.cms

The Strapi CMS behind the Godrej Conscious Collective website.

Run it from the repository root — `pnpm dev` starts this and the website
together. `pnpm --filter app.cms dev` runs it alone.

## Dependencies that look wrong and are not

**`react`, `react-dom`, `react-router-dom` and `styled-components`** are peers
of `@strapi/admin` and have to be direct dependencies of this workspace:
`strapi build` checks for them by name and refuses to run without them —

```
[ERROR] The Strapi admin is missing required dependencies:
   - react-router-dom@^6.0.0
```

They belong to the admin panel's own bundle. Nothing in `src/` imports them, and
in particular the **website does not use `react-router-dom`** — it is on React
Router 8, where that package no longer exists.

**`pg`** ships even though development runs on SQLite, because
`config/database.ts` supports Postgres for production and knex resolves its
driver at runtime.

**`better-sqlite3` must not be added to `onlyBuiltDependencies`** in
`pnpm-workspace.yaml`. See the comment there.

## Layout

- `config/` — the Strapi configuration. `config/env/production/` holds the
  production overrides, which Strapi deep-merges over the base files.
- `database/migrations/` — Strapi's migrations directory, discovered by
  convention at this app's root. Indexes and schema changes go here, never
  through an `indexes` key in a `schema.json`.
- `src/policies/`, `src/middlewares/` — global policies and middlewares,
  referenced as `global::<filename>`.
- `src/extensions/<plugin>/strapi-server.ts` — plugin extensions.
- `src/this/` — plain modules that are not a Strapi concept. None of Strapi's
  loaders read this directory, so a module here cannot be mistaken for a content
  type, a component or a config namespace.
- `tests/` — the CMS test seam. `pnpm --filter app.cms test`. Excluded from
  `tsconfig.json` so nothing lands in `dist`, and typechecked instead through
  `tsconfig.tests.json`, which the `typecheck` script also runs.

## Admin metadata lives in the schema files

Every `schema.json` may carry a top-level `"__"` key. Strapi ignores root keys
it does not recognise, so the declaration rides along on the loaded model, and
this application's bootstrap merges it into the content manager's stored
configuration on every boot. That is what keeps field labels, descriptions and
admin form layouts in version control instead of clicked into the admin panel.

```json
{
	"attributes": { "name": { "type": "string" } },

	"__": {
		"note": "Free text. Ignored.",
		"metadatas": {
			"name": {
				"edit": { "label": "Name", "description": "What it is called" },
				"list": { "label": "Name" }
			}
		},
		"layouts": {
			"list": [ "name" ],
			"edit": [ [ { "name": "name", "size": 6 } ] ]
		}
	}
}
```

Three things to know:

- **The file wins on every boot**, and anything the file does not mention
  survives from the database. Arrays — the layouts — are replaced wholesale
  rather than concatenated, so a declared layout must be stated in full.
- **A key naming an attribute that does not exist fails the boot**, as does a
  misspelt key inside `"__"` itself. This is the one check in this application
  allowed to refuse the boot, and it is allowed because the remedy is a file in
  this repository rather than a screen inside the admin panel.
- **Schema files must be valid strict JSON.** No trailing commas. `tsc` re-emits
  them into `dist` and would launder one, so a test enforces it instead.

See `src/this/admin-metadata/`.
