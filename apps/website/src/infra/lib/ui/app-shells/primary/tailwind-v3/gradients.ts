
/**
 |
 | Gradients (Phase 6) — bridge the v4 `bg-linear-*` naming to v3.
 |
 | Tailwind v4 renamed the linear-gradient direction utilities from
 | `bg-gradient-to-*` (v3) to `bg-linear-to-*` (v4). Everything else the markup
 | uses is already native in v3.4:
 |   • `from-*` / `via-*` / `to-*` colour stops — core utilities;
 |   • gradient stop POSITIONS (`via-25%`, `via-45%`, `via-15%`) — added in v3.3;
 |   • the `/opacity` modifier on stops (`via-context/0`) — emits plain `rgba()`
 |     via the colour tokens' `rgba(var(--x), <alpha-value>)` shape (Phase 2).
 |
 | So the only gap is the direction class name. Per the §2 gradient order we take
 | the plugin route (option b): register `bg-linear-to-{dir}` utilities that emit
 | exactly the same `background-image: linear-gradient(to <dir>, …)` that v3's
 | `bg-gradient-to-{dir}` does, consuming the same `--tw-gradient-stops` plumbed
 | by the core `from/via/to` utilities. This keeps the markup unchanged (incl.
 | `after:bg-linear-to-r`, `md:after:bg-linear-to-r`) — no Phase 7 rewrite needed
 | for gradients.
 |
 | See the static site's docs/tailwind-v3-migration-handoff.md §5.8 / §6 / §7 (Phase 6).
 |
 */

import plugin from "tailwindcss/plugin"

// Direction keyword for each `bg-linear-to-<suffix>` class — identical to the
// directions v3's `bg-gradient-to-*` utilities use.
const directions: Record<string, string> = {
	t: "to top",
	tr: "to top right",
	r: "to right",
	br: "to bottom right",
	b: "to bottom",
	bl: "to bottom left",
	l: "to left",
	tl: "to top left",
}

export const gradients_plugin = plugin( ( { addUtilities } ) => {
	const utilities: Record<string, Record<string, string>> = {}
	for ( const [ suffix, direction ] of Object.entries( directions ) ) {
		utilities[`.bg-linear-to-${suffix}`] = {
			backgroundImage:
				`linear-gradient(${direction}, var(--tw-gradient-stops))`,
		}
	}
	addUtilities( utilities )
} )
