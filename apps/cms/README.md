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
