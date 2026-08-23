# Schema files declare their own admin metadata

Status: accepted

Field labels, descriptions and admin form layouts are **declared in the schema file that owns the fields**, not clicked into the admin panel. Every `schema.json` in this repository may carry a top-level `"__"` key, and the application's bootstrap merges what it finds there into the content manager's configuration store on every boot. Strapi ignores root keys it does not recognise, so the declaration rides along on the loaded model and arrives as `strapi.contentTypes[ uid ].__` or `strapi.components[ uid ].__`.

This is the pattern the gdl reference project established, adopted here with the two improvements the spec asks for: every key is checked against the schema's actual attributes, and every schema file must be valid strict JSON.

The mechanism lives at `apps/cms/src/this/admin-metadata/`.

## What a declaration may contain

Exactly three keys, and **any other key fails the boot**:

- `metadatas` — keyed by attribute name, each holding `edit` and `list` objects, as the content manager stores them.
- `layouts` — `list`, an array of attribute names; and `edit`, an array of rows of `{ name, size }`.
- `note` — free text for whoever opens the file next. Ignored.

The key set is closed rather than open because an unrecognised key is never read. A `metadata` that should have been `metadatas`, or a `layout` that should have been `layouts`, would otherwise do nothing at all and say nothing about it — which is the same silent-typo failure this decision exists to close, one level up from the attribute names.

`settings` — the content manager's third configuration key, which carries `mainField`, `defaultSortBy` and the rest — is deliberately **not** accepted. Nothing merges it yet, and accepting a key the bootstrap ignores would reintroduce exactly the silence described above. Adding it later means teaching the validator what a valid `settings` key is, because its keys are not attribute names.

Every attribute name inside a declaration is checked against the schema's **actual** attributes. `id` and `documentId` count as attributes even though no schema declares them, because the content manager injects both into the model it renders and a list layout may legitimately name either.

## How it is merged

The declaration is deep-merged **over** whatever the store already holds, and **arrays are replaced wholesale rather than concatenated**. So:

- the file wins on every boot, for everything it mentions;
- anything the file does not mention survives from the database, including an editor's own changes and the content manager's own defaults; and
- a declared layout must state that layout **in full**, because a partial one replaces rather than extends. Concatenating would duplicate every field on every restart.

This runs in the **user** bootstrap, which Strapi runs after every plugin's. The content manager's own bootstrap has by then written a default configuration for any schema the store had never seen, and that default is what the declaration merges over. Reordering these two would change what an unmentioned field looks like on a fresh database, so the ordering is load-bearing rather than incidental.

## Considered options

**Leave it in the admin panel, as Strapi intends.** Rejected. The configuration lives only in the database, so a fresh database produces a different admin from the old one, and nothing about the arrangement of an editor's form is reviewable, diffable or recoverable. Twenty-odd schemas make this a re-clicking exercise on every environment.

**Take gdl's version unchanged.** Rejected, on the two points the spec names. gdl validates nothing, so a mistyped attribute name is a silent no-op — a label that simply never appears, months after the typo. And two of its schema files are not valid JSON, surviving only because `tsc` re-emits them into `dist` under `resolveJsonModule` rather than copying them, laundering the trailing commas before Strapi's strict parse ever sees the file.

**Tolerate unknown keys inside `"__"`,** so that a schema can carry arbitrary documentation. Rejected for the closed set above. The one legitimate use — explaining the file to the next reader — is served by `note`.

**Validate, but warn instead of failing.** Rejected. A warning at boot is read by nobody; it scrolls past in the same output that carries Strapi's own startup banner. That the check refuses the boot outright is settled in the spec, under "The metadata infrastructure", as the deliberate exception to the rule stated under Lead protection.

## Consequences

**Every schema written from the tracer bullet onward carries a declaration.** That is why this decision comes before any content type exists — retrofitting twenty schema files is worse than building the mechanism first.

**Schema files must be valid strict JSON.** No trailing commas. Nothing in the toolchain enforces this: `tsc` launders them on the way to `dist`, and dprint's JSON plugin is configured to *maintain* trailing commas, in a configuration file that `.gitignore.user` keeps out of the repository anyway. A test at `apps/cms/tests/schema-files-are-strict-json.test.ts` parses every `.json` under `apps/cms/src` instead.

**A typo is a boot failure, naming the schema and the offending key.** The remedy is a file in this repository, so the developer who mistypes an attribute name finds out immediately rather than when an editor notices a missing label.

**It is called a *declaration*, not a *block*.** `CONTEXT.md` reserves "block" for a node in the render tree, and explicitly forbids reusing the word — rich text is never called "blocks" for the same reason. The build plan's own prose says "metadata block", and predates this; the code, the editor-facing error text and these records say "declaration".

**Reversing this is cheap for the mechanism and expensive for the content.** Deleting the bootstrap leaves whatever the database currently holds, which is the merged result, so the admin does not visibly change until somebody edits it. Re-deriving the declarations from a database that has since drifted is the expensive part.
