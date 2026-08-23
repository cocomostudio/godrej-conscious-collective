# 5. Tailwind stays on v3 for the browser floor

- **Status:** Accepted
- **Date:** 2026-08-23

Carried over from the static site's ADR 0001, which recorded the original
downgrade. This effort inherits the decision along with the Tailwind plugin
tree, so the decision is restated here rather than left behind in a repository
this one does not depend on.

## Context

The mandated browser support floor is **Safari 15, Firefox 92 and Chrome 94**.

Tailwind v4 targets Safari 16.4+, Chrome 111+ and Firefox 128+, because its
generated CSS depends on `@property`, `color-mix()` — which it emits for *every*
opacity modifier, so `bg-black/20` alone is enough to break — native cascade
layers, `oklch()` and container queries. On the three target browsers that
output degrades badly rather than failing visibly.

The static site discovered this late, migrated to v3, and shipped the modular
plugin tree that `apps/website` now lifts intact.

## Decision

**The website builds Tailwind CSS v3, compiled through PostCSS**
(`tailwindcss@3.4.19` + `autoprefixer`). It is not upgraded to v4.

The configuration is a tree of modular plugins — one module per concern:
spacing, typography, colours, layout and grid, backgrounds, components,
variants — composed by a thin `tailwind.config.ts`, at
`apps/website/src/infra/lib/ui/app-shells/primary/tailwind-v3/`.

Two consequences of the floor are load-bearing inside that tree and must not be
undone:

- **Colours are stored as RGB channel triplets in CSS variables** and exposed as
  `rgba( var( --x ), <alpha-value> )`, so opacity modifiers compile to plain
  `rgba()` and never to `color-mix()`.
- **Responsive typography is driven by per-role CSS variables** reassigned
  inside a media query, rather than by v4's `@theme` reassignment.

Unlike the static site, no dormant v4 tree is carried. There is no engine
toggle and no `tailwindcss@4` package alias — this is a greenfield build, and a
second dormant configuration would be a second thing to keep current.

## Consequences

**Positive**
- Meets the browser floor.
- v3's static, computed theme keeps editor autocomplete fully populated.

**Negative**
- Loses v4's CSS-first `@theme`/`@utility` authoring and the faster
  `@tailwindcss/vite` plugin; PostCSS is the build path instead.
- v3 cannot compute spacing on demand, so the spacing scale is generated and
  bounded (ceiling 400; anything past it uses arbitrary syntax).

**Reversibility**
- Expensive. Reversing means a framework major-version change and a full config
  rewrite — and it cannot happen at all while the browser floor stands.

## Alternatives considered

1. **Upgrade to v4 and post-process the output.** Rejected — there is no
   reliable way to back-port `@property`, `color-mix()` and native `@layer`
   semantics to Safari 15.
2. **Relax the browser floor.** Rejected — the floor is a product requirement.
3. **Carry both engines, as the static site does.** Rejected — running both
   simultaneously proved fragile there (Vite always applies
   `postcss.config.js`), and a dormant tree in a greenfield repository is
   maintenance with no reader.
