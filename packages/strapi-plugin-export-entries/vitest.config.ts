
import { defineConfig } from "vitest/config"

export default defineConfig( {
	test: {
		// Strapi keeps global state — `global.strapi`, the database connection,
		// the plugin registries — so two instances must never be alive at once.
		fileParallelism: false,
		// Every file boots at least one Strapi instance, which takes several
		// seconds. Both timeouts are generous for that reason alone.
		hookTimeout: 120_000,
		include: [ "tests/**/*.test.ts" ],
		testTimeout: 120_000,
	},
} )
