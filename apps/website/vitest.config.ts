
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
 | One file at a time, though. Booting the server runs React Router's type
 | generation, which rewrites `.react-router/types` and removes the directories
 | it no longer needs — so two files booting at once race each other over the
 | same tree and one of them fails with `ENOTEMPTY`. Every test still passes when
 | that happens, which is the worst way for it to fail: the run is red and
 | nothing in it is wrong.
 |
 */

export default defineConfig( {
	test: {
		fileParallelism: false,
		hookTimeout: 60_000,
		include: [ "tests/**/*.test.ts" ],
		testTimeout: 30_000,
	},
} )
