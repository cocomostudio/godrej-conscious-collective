
import { defineConfig } from "vitest/config"

/**
 |
 | The website's tests boot the real Express server and drive it over HTTP.
 |
 | No `--conditions development` here, unlike the `dev` script: the whole
 | request path is loaded through Vite's SSR graph, so React Router is resolved
 | once rather than twice, and the `instanceof RouterContextProvider` check in
 | `getLoadContext` has only one class to compare against.
 |
 | Booting the server costs a second or two rather than the CMS's twenty, so
 | there is no reason to share one across files.
 |
 */

export default defineConfig( {
	test: {
		hookTimeout: 60_000,
		include: [ "tests/**/*.test.ts" ],
		testTimeout: 30_000,
	},
} )
