
/**
 |
 | Backgrounds (Phase 5) — ported from the v4 `tailwind/backgrounds.css`.
 |
 | Five decorative mesh-gradient utilities. They are static (no Tailwind tokens),
 | so they port as a flat `addUtilities` map — the CSS is copied verbatim from the
 | v4 `@utility` blocks (the `& { … }` wrappers there were just grouping; the
 | declarations are reproduced directly on each class).
 |
 | These class names are referenced as string literals in `src/lib/react/card.tsx`,
 | so the content scanner picks them up and emits them on demand.
 |
 | See the static site's docs/tailwind-v3-migration-handoff.md §5.6 / §7 (Phase 5).
 |
 */

import plugin from "tailwindcss/plugin"

// Shared inline SVG fractal-noise filter (used as a background-image layer).
const noise_svg_2200 =
	"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 2200 2200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")"
const noise_svg_1799 =
	"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 1799 1799' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")"
const noise_svg_3000 =
	"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 3000 3000' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")"

export const backgrounds_plugin = plugin( ( { addUtilities } ) => {
	addUtilities( {
		".bg-mesh-gradient-1": {
			"--x-0": "2%",
			"--c-0": "hsla(90, 10%, 41%, 1)",
			"--s-start-0": "9.607184652436587%",
			"--s-end-0": "46.553805035598664%",
			"--y-0": "3%",
			"--y-1": "41%",
			"--s-start-1": "9.607184652436587%",
			"--s-end-1": "46.553805035598664%",
			"--c-1": "hsla(155, 17%, 31%, 1)",
			"--x-1": "20%",
			"--y-2": "27%",
			"--x-2": "42%",
			"--s-start-2": "4.389815627743634%",
			"--s-end-2": "27.076429519452372%",
			"--c-2": "hsla(1, 17%, 62%, 1)",
			"--x-3": "62%",
			"--y-3": "9%",
			"--c-3": "hsla(155, 17%, 31%, 1)",
			"--s-start-3": "9.607184652436587%",
			"--s-end-3": "46.553805035598664%",
			"--s-start-4": "4.468860388430093%",
			"--s-end-4": "28.726764092851464%",
			"--y-4": "95%",
			"--x-4": "96%",
			"--c-4": "hsla(187, 87%, 13%, 1)",
			backgroundColor: "hsla(187, 95%, 9%, 1)",
			backgroundImage:
				`${noise_svg_2200},radial-gradient(circle at var(--x-0) var(--y-0), var(--c-0) var(--s-start-0),transparent var(--s-end-0)),radial-gradient(circle at var(--x-1) var(--y-1), var(--c-1) var(--s-start-1),transparent var(--s-end-1)),radial-gradient(circle at var(--x-2) var(--y-2), var(--c-2) var(--s-start-2),transparent var(--s-end-2)),radial-gradient(circle at var(--x-3) var(--y-3), var(--c-3) var(--s-start-3),transparent var(--s-end-3)),radial-gradient(circle at var(--x-4) var(--y-4), var(--c-4) var(--s-start-4),transparent var(--s-end-4))`,
		},

		".bg-mesh-gradient-2": {
			backgroundColor: "hsla(213, 0%, 93%, 1)",
			backgroundImage:
				"radial-gradient(circle at 83% 22%, hsla(35, 82%, 87%, 1) 0%, transparent 50%), radial-gradient(circle at 0% 50%, hsla(194, 37%, 91%, 1) 0%, transparent 50%), radial-gradient(circle at 21% 21%, hsla(27, 0%, 86%, 1) 0%, transparent 50%), radial-gradient(circle at 54% 77%, hsla(193, 100%, 95%, 1) 0%, transparent 50%), radial-gradient(circle at 30% 75%, hsla(197, 25%, 35%, 1) 0%, transparent 50%)",
			backgroundBlendMode: "normal, normal, normal, normal, normal",
		},

		".bg-mesh-gradient-gray-1": {
			"--c-0": "hsla(207, 0%, 67%, 1)",
			"--y-0": "9%",
			"--s-start-0": "0%",
			"--s-end-0": "50%",
			"--x-0": "31%",
			"--s-start-1": "4.609157820444496%",
			"--s-end-1": "50%",
			"--c-1": "hsla(0, 0%, 100%, 0.3)",
			"--x-1": "2%",
			"--y-1": "98%",
			"--s-start-2": "0%",
			"--s-end-2": "83.62005565477455%",
			"--x-2": "41%",
			"--c-2": "hsla(0, 0%, 100%, 0.3)",
			"--y-2": "86%",
			"--x-3": "98%",
			"--y-3": "97%",
			"--s-start-3": "0%",
			"--s-end-3": "50%",
			"--c-3": "hsla(13, 0%, 67%, 1)",
			backgroundColor: "hsla(0, 0%, 0%, 0.2)",
			backgroundImage:
				"radial-gradient(circle at var(--x-0) var(--y-0), var(--c-0) var(--s-start-0), transparent var(--s-end-0)), radial-gradient(circle at var(--x-1) var(--y-1), var(--c-1) var(--s-start-1), transparent var(--s-end-1)), radial-gradient(circle at var(--x-2) var(--y-2), var(--c-2) var(--s-start-2), transparent var(--s-end-2)), radial-gradient(circle at var(--x-3) var(--y-3), var(--c-3) var(--s-start-3), transparent var(--s-end-3))",
		},

		".bg-mesh-gradient-pastel-rainbow": {
			backgroundColor: "hsla(79, 97%, 65%, 1)",
			backgroundImage:
				`${noise_svg_1799}, radial-gradient(circle at 94% 95%, hsla(186, 100%, 31%, 1) 3%, transparent 76%), radial-gradient(circle at 86% 50%, hsla(318, 80%, 65%, 0) 7%, transparent 76%), radial-gradient(circle at 89% 79%, hsla(41, 100%, 63%, 1) 7%, transparent 87%), radial-gradient(circle at 15% 44%, hsla(3, 74%, 80%, 1) 15%, transparent 81%), radial-gradient(circle at 99% 20%, hsla(75, 88%, 92%, 1) 1%, transparent 68%)`,
			backgroundBlendMode:
				"overlay, normal, normal, normal, normal, normal",
		},

		".bg-mesh-gradient-purple-orange-circles": {
			"--y-0": "43.9518%",
			"--c-0": "rgba(223, 83, 167, 0.75)",
			"--c-1": "rgba(229, 80, 16, 0.83)",
			"--s-start-0": "5.19211%",
			"--x-1": "60.6251%",
			"--s-start-1": "9.39723%",
			"--x-0": "36.7979%",
			"--s-end-0": "28.829%",
			"--y-1": "48.911%",
			"--s-end-1": "49.9103%",
			"--y-2": "52%",
			"--x-2": "53%",
			"--c-2": "hsla(106, 94%, 89%, 0.87)",
			"--y-3": "52%",
			"--c-3": "hsla(137, 93%, 64%, 0)",
			"--x-3": "39%",
			"--c-4": "hsla(201, 97%, 75%, 0)",
			"--y-4": "29%",
			"--x-4": "11%",
			"--s-start-2": "2%",
			"--s-start-3": "6%",
			"--s-start-4": "8%",
			"--s-end-2": "141.78768296603226%",
			"--s-end-3": "68%",
			"--s-end-4": "74%",
			backgroundColor: "hsla(211, 34%, 56%, 0.85)",
			backgroundImage:
				`${noise_svg_3000}, radial-gradient(circle at var(--x-0) var(--y-0), var(--c-0) var(--s-start-0), transparent var(--s-end-0)), radial-gradient(circle at var(--x-1) var(--y-1), var(--c-1) var(--s-start-1), transparent var(--s-end-1)), radial-gradient(circle at var(--x-2) var(--y-2), var(--c-2) var(--s-start-2), transparent var(--s-end-2)), radial-gradient(circle at var(--x-3) var(--y-3), var(--c-3) var(--s-start-3), transparent var(--s-end-3)), radial-gradient(circle at var(--x-4) var(--y-4), var(--c-4) var(--s-start-4), transparent var(--s-end-4))`,
			backgroundBlendMode:
				"overlay, normal, normal, normal, normal, normal",
		},
	} )
} )
