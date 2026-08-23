# No SEO plugin — the SEO component schemas are ours

Per-entry SEO metadata would normally come from `@notum-cz/strapi-plugin-seo`, the legitimate successor to Strapi's deprecated plugin. We do not take that dependency. The two component schemas it would install — a root SEO component and a nested open-graph one — are written and owned in this repository under the `page_meta` category, and attached by hand to Page, Session and Contributor.

Version 2.0.12 is broken on Strapi 5, and its peer range claims compatibility so nothing warns you: its admin bundle derives the plugin id by stripping a `@strapi/plugin-` prefix the package no longer carries, calls routes under the full package name while the server registers them under `seo`, and throws before rendering. The fix exists as an open, unmerged pull request. Adopting it behind a `pnpm patch` was rejected — this effort already carries `strapi-plugin-webtools` as a fragile dependency, and a second plugin needing a day-one patch merely to boot is the wrong direction. There is no alternative: both other SEO plugin repositories now redirect to this one.

## Consequences

We lose the admin's SEO analysis panel and nothing else. The plugin never registered its components — it wrote their JSON into the application's own components directory, after which they were locally owned anyway. Owning them outright means they can carry a `__` admin-metadata declaration like every other component in the catalogue.

Adopting the plugin later, if it is ever fixed, is cheap: the attribute is already named `seo`, which is the name its admin hardcodes.

Its true shipped shape — one root component with nine attributes plus a nested open-graph component, and **no** repeatable social-media component — is recorded in `__this-project/build-plans/2026-08-23__cms-and-frontend/assets/seo-plugin-surface.md`. Its own README and Strapi's public components repository are both stale on the point.
