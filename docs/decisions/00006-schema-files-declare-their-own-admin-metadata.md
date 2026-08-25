# Schema files declare their own admin metadata

Field labels, descriptions and admin form layouts are **declared in the schema file that owns the fields**, not clicked into the admin panel. Every `schema.json` may carry a top-level `"__"` key, which Strapi's loaders carry onto the model unrecognised, and the application's user bootstrap merges what it finds there into the content manager's configuration store on every boot. Left in the admin panel, as Strapi intends, that configuration would live only in the database: a fresh database would produce a different admin from the old one, nothing about the arrangement of an editor's form would be reviewable, diffable or recoverable, and twenty-odd schemas would make it a re-clicking exercise on every environment.

The pattern comes from the gdl reference project, with the two defects the spec names fixed: gdl validates nothing, so a mistyped attribute name is a silent no-op, and two of its schema files are not valid JSON, surviving only because the build re-emits them. The mechanism, and why it merges the way it does, is documented at `apps/cms/src/this/admin-metadata/`.

## Consequences

**A typo is a boot failure**, naming the schema and the offending key, rather than a missing label an editor notices months later. `"__"` accepts exactly `metadatas`, `metadatas_outside_production`, `layouts` and `note`, and any other key fails too — an unrecognised key is never read, so a `metadata`-for-`metadatas` slip would otherwise be the same silent failure one level up. Warning instead of failing was rejected: a boot warning scrolls past unread in the same output as Strapi's startup banner.

**A field can be shown to a developer and hidden from an editor.** `metadatas_outside_production` is merged over `metadatas` when `NODE_ENV` is anything but `production`, and an unset `NODE_ENV` counts as development — the reading `scripts/seed/guards.ts` already takes. The base half states the production value, so the switch travels in both directions: a production boot writes `false` back over whatever a development boot left in the store. It exists for `media.image-v1`'s `url`, which the seed script fills so that a fresh clone needs no uploads and which an editor, who has the file field beside it, should never see. Per-role visibility was considered and rejected: Strapi's field-level permissions never recurse into a dynamic zone, and the content manager skips the permission check inside one outright, so the rule would hold on a session's cover and a contributor's portrait and silently fail on every image an editor places in a region.

**Every schema written from the tracer bullet onward carries a declaration.** That is why this decision lands before any content type exists — retrofitting twenty schema files is worse than building the mechanism first.

**Schema files must be valid strict JSON**, and nothing in the toolchain enforces it — `tsc` launders trailing commas on the way to `dist`. A test at `apps/cms/tests/schema-files-are-strict-json.test.ts` parses every `.json` under `apps/cms/src` instead.

**It is called a *declaration*, not a *block*.** `CONTEXT.md` reserves "block" for a node in the render tree. The build plan's prose says "metadata block" and predates this.

Reversing is cheap for the mechanism and expensive for the content: deleting the bootstrap leaves the merged result sitting in the database, but re-deriving declarations from a database that has since drifted is the work.
