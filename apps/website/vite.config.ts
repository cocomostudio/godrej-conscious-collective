
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { reactRouter } from "@react-router/dev/vite"

/**
 |
 | Tailwind is compiled by PostCSS (see postcss.config.js), which Vite loads on
 | its own. There is deliberately no `@tailwindcss/vite` plugin here: Tailwind
 | stays on v3 because the browser floor is Safari 15, Firefox 92 and Chrome 94.
 |
 | The SSR input lives under `environments.ssr.build` rather than behind an
 | `isSsrBuild` branch. React Router 8 always enables Vite's Environment API, and
 | the `isSsrBuild` shape silently produces the wrong server artifact.
 |
 */

export default defineConfig( {
	environments: {
		ssr: {
			build: {
				rollupOptions: {
					input:
						"./src/infra/server/web/react-router-middleware.ts",
					// ↑ This becomes the entry point of the server build. The
					// 	"virtual:react-router/server-build" import inside it is
					// 	resolved to a real path by the build.
				},
			},
		},
	},
	plugins: [
		tsconfigPaths(),
		reactRouter(),
	],
} )
