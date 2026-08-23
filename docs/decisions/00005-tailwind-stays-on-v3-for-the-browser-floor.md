# Tailwind stays on v3 for the browser floor

The mandated browser support floor is **Safari 15, Firefox 92 and Chrome 94**. Tailwind v4 targets Safari 16.4+, Chrome 111+ and Firefox 128+, because its generated CSS depends on `@property`, native cascade layers, `oklch()`, container queries and `color-mix()` — which it emits for *every* opacity modifier, so `bg-black/20` alone is enough to break — and on those browsers the output degrades badly rather than failing visibly. So the website builds **Tailwind v3 (`tailwindcss@3.4.19`) through PostCSS**, lifting the static site's modular plugin tree intact into `apps/website/src/infra/lib/ui/app-shells/primary/tailwind-v3/`. Restated here from the static site's ADR 0001 because this effort inherits the decision without depending on that repository.

## Consequences

Two things inside the plugin tree are load-bearing and must not be undone: **colours are stored as RGB channel triplets** in CSS variables and exposed as `rgba( var( --x ), <alpha-value> )`, so opacity modifiers compile to plain `rgba()` and never to `color-mix()`; and **responsive typography is driven by per-role CSS variables** reassigned inside a media query, rather than by v4's `@theme` reassignment.

Unlike the static site, no dormant v4 tree is carried — running both engines proved fragile there (Vite always applies `postcss.config.js`), and a second configuration in a greenfield repository is maintenance with no reader.

v3 cannot compute spacing on demand, so the spacing scale is generated and bounded (ceiling 400; anything past it uses arbitrary syntax). Reversal means a framework major-version change and a full config rewrite, and cannot happen at all while the floor stands.
