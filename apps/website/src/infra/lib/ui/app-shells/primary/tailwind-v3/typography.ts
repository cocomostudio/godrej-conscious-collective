
/**
 |
 | Typography (Phase 3) — ported from the v4 `tailwind/typography.css`.
 |
 | v4 drove responsive type by reassigning `--text-*` tokens inside a
 | `@layer theme @variant lg` block. v3 reproduces that with per-role CSS vars:
 |   • `--text-<role>-fs` / `-lh` (and `-ls` / `-fw` where the role defines them)
 |     are set on `:root` at the base (sm/md) size, then overridden inside an
 |     `@media (min-width: lg)` block for the few roles that grow at lg.
 |   • The `fontSize` tokens below REFERENCE those vars, so a single `text-h1`
 |     class restyles itself responsively without an `lg:` variant in markup.
 |
 | The `@font-face` declarations and font-smoothing live in the plain-CSS partial
 | `./typography.css` (imported by `./index.css`) — they need no Tailwind.
 |
 | See the static site's docs/tailwind-v3-migration-handoff.md §5.4 / §5.11.
 |
 */

import plugin from "tailwindcss/plugin"

import { screens } from "./screens.ts"

// Public Sans + the system fallback stack (was v4's `--font-sans`).
export const font_family = {
	sans: [
		"Public Sans",
		"ui-sans-serif",
		"system-ui",
		"sans-serif",
		"Apple Color Emoji",
		"Segoe UI Emoji",
		"Segoe UI Symbol",
		"Noto Color Emoji",
	],
}

// Per-role type spec. `base` applies at every breakpoint; `lg` overrides only
// the roles that grow past the lg breakpoint (matching the v4 `@variant lg`).
// `ls` (letter-spacing) and `fw` (font-weight) are role-constant where present.
type type_role = {
	base: { fs: string; lh: string; ls?: string; fw?: string }
	lg?: { fs: string; lh: string }
}

const roles: Record<string, type_role> = {
	h1: {
		base: { fs: "2rem", lh: "1.25" },
		lg: { fs: "2.9375rem", lh: "1.2" },
	},
	h2: {
		base: { fs: "1.6875rem", lh: "1.35" },
		lg: { fs: "2.375rem", lh: "1.25" },
	},
	h3: {
		base: { fs: "1.5625rem", lh: "1.3" },
		lg: { fs: "1.9375rem", lh: "1.3" },
	},
	h4: {
		base: { fs: "1.25rem", lh: "1.4" },
		lg: { fs: "1.4375rem", lh: "1.4" },
	},
	h5: {
		base: { fs: "1.0625rem", lh: "1.15" },
		lg: { fs: "1.1875rem", lh: "1.45" },
	},
	h6: {
		base: { fs: "0.9375rem", lh: "1.35" },
		lg: { fs: "1.0625rem", lh: "1.4" },
	},
	p: {
		base: { fs: "0.8125rem", lh: "1.55" },
		lg: { fs: "0.9375rem", lh: "1.6" },
	},
	small: {
		base: { fs: "0.75rem", lh: "1.3" },
		lg: { fs: "0.8125rem", lh: "1.5" },
	},
	caption: {
		base: { fs: "0.6875rem", lh: "1.2" },
		lg: { fs: "0.75rem", lh: "1.3" },
	},
	button: {
		base: { fs: "0.6875rem", lh: "1.1", ls: "0.01em", fw: "500" },
		lg: { fs: "0.75rem", lh: "1.3" },
	},
	input: {
		base: { fs: "0.75rem", lh: "1.3" },
		lg: { fs: "0.8125rem", lh: "1.5" },
	},
	nav: { base: { fs: "1rem", lh: "1.5" } },
}

// `fontSize` tokens reference the per-role vars. The third tuple slot carries
// line-height plus, for `button`, letter-spacing and font-weight.
function build_font_size () {
	const font_size: Record<string, [ string, Record<string, string> ]> = {}
	for ( const [ role, spec ] of Object.entries( roles ) ) {
		const options: Record<string, string> = {
			lineHeight: `var( --text-${role}-lh )`,
		}
		if ( spec.base.ls !== undefined ) {
			options.letterSpacing = `var( --text-${role}-ls )`
		}
		if ( spec.base.fw !== undefined ) {
			options.fontWeight = `var( --text-${role}-fw )`
		}
		font_size[role] = [ `var( --text-${role}-fs )`, options ]
	}
	return font_size
}

export const font_size = build_font_size()

// Emits the base `--text-*` vars on `:root`, then the lg overrides inside an
// `@media (min-width: <lg>)` block — the v4 `@variant lg` reassignment.
export const typography_base_plugin = plugin( ( { addBase } ) => {
	const base_vars: Record<string, string> = {}
	const lg_vars: Record<string, string> = {}

	for ( const [ role, spec ] of Object.entries( roles ) ) {
		base_vars[`--text-${role}-fs`] = spec.base.fs
		base_vars[`--text-${role}-lh`] = spec.base.lh
		if ( spec.base.ls !== undefined ) {
			base_vars[`--text-${role}-ls`] = spec.base.ls
		}
		if ( spec.base.fw !== undefined ) {
			base_vars[`--text-${role}-fw`] = spec.base.fw
		}

		if ( spec.lg !== undefined ) {
			lg_vars[`--text-${role}-fs`] = spec.lg.fs
			lg_vars[`--text-${role}-lh`] = spec.lg.lh
		}
	}

	addBase( {
		":root": base_vars,
		[`@media (min-width: ${screens.lg})`]: { ":root": lg_vars },
	} )
} )
