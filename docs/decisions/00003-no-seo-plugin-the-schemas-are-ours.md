# No SEO plugin — the SEO component schemas are ours

Status: accepted

The site needs per-entry SEO metadata, and the obvious route is `@notum-cz/strapi-plugin-seo`, the legitimate successor to Strapi's own deprecated plugin. We are **not** taking that dependency. The two component schemas it would have installed — a root SEO component and a nested open-graph component — are written and owned directly in this repository instead, under the `page_meta` category, and attached by hand to Page, Session and Contributor.

## Why the plugin does not work

Version 2.0.12 is broken on Strapi 5, and its peer range claims compatibility, so nothing warns you. Its admin bundle derives its plugin id by stripping a `^@strapi/plugin-` prefix that the package name no longer carries, having moved scope. The admin therefore calls a route under the full package name while the server registers its routes under `seo`, and the plugin's page throws before rendering. Verified in the shipped `dist` chunk. The fix exists as an open, unmerged pull request. Secondarily, `@strapi/design-system` and React are declared as runtime dependencies rather than peers, which breaks admin builds under pnpm.

## Considered options

**Adopt it behind a `pnpm patch`** fixing the plugin id. Rejected. This effort already carries `strapi-plugin-webtools` as a fragile dependency — bus factor one, CI nineteen stable Strapi releases behind the version we pin, and a paid addon we have not bought for the feature we most need. Adding a second plugin that requires patching on day one merely to boot is the wrong direction.

**Find another plugin.** There isn't one. Both `strapi/strapi-plugin-seo` and `strapi-community/plugin-seo` now redirect to this repository; it is the end of the line.

## Consequences

We lose the admin's SEO analysis panel, and nothing else. The schemas, the attribute wiring and the populate branch were ours to write under every option — the plugin never registered its components, it wrote their JSON into the application's own components directory through the content-type builder, after which they were owned locally anyway.

We gain the ability to put a `__` metadata block inside those two component files, so their field labels and descriptions are version-controlled exactly like every other component in the catalogue. Under the plugin they would have been the only two that were not.

Note for anyone comparing against documentation: the shipped shape is one root component with nine attributes plus a nested open-graph component. There is **no** repeatable social-media component. That is the plugin's version 1 shape, and both its own README and Strapi's public components repository are stale on the point.

Adopting the plugin later is cheap if it is ever fixed — the attribute is already named `seo`, which is the name its admin hardcodes.
