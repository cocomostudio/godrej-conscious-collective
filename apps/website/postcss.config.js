
/**
 |
 | PostCSS pipeline for the Tailwind CSS v3 build.
 |
 | Tailwind v3 emits plain CSS and Autoprefixer adds the prefixes the mandated
 | browser floor needs — Safari 15 / Firefox 92 / Chrome 94, declared in this
 | package's `browserslist` field.
 |
 */

import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"

export default {
	plugins: [
		tailwindcss(
			"./src/infra/lib/ui/app-shells/primary/tailwind-v3/tailwind.config.ts",
		),
		autoprefixer(),
	],
}
