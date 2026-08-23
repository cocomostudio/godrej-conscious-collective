# Populate fragments

This tree mirrors `src/components/`, one file per component schema, and holds
the populate fragment for each.

**It must not live inside `src/components/` itself.** Strapi's component loader
globs `*/*.*(js|json)` at a fixed depth of two. A TypeScript file placed beside
a schema compiles into the `dist` output as JavaScript, gets picked up by that
glob, fails the collection-name check and terminates the process at boot.

`src/this/` is inert: all eight of Strapi's loaders read hardcoded directory
names and nothing enumerates `src/` itself, so a plain module here is never
mistaken for a content type, a component or a config namespace. The development
watcher does pick up changes here.

A fragment is the **populate map** — the value that goes under a `populate` key,
not the wrapper. So a fragment for a component with a nested component reads:

```ts
export const populate_heading_v1 = {
	link: { populate: populate_link_v1 },
}
```

Content types mirror the same way, under `src/this/api/`.
