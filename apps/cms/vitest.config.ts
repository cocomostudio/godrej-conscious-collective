
import { defineConfig } from "vitest/config"

export default defineConfig( {
	test: {
		// Strapi keeps global state — `global.strapi`, the database connection,
		// the plugin registries — so two instances must never be alive at once.
		fileParallelism: false,
		// Booting a Strapi instance takes tens of seconds. Both timeouts are
		// generous for that reason, and for that reason alone.
		hookTimeout: 120_000,
		include: [ "tests/**/*.test.ts" ],
		testTimeout: 120_000,
	},
} )
