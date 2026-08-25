
import { defineConfig } from "vitest/config"

export default defineConfig( {
	test: {
		// Strapi keeps global state — `global.strapi`, the database connection,
		// the plugin registries — so two instances must never be alive at once.
		fileParallelism: false,
		// Booting a Strapi instance takes tens of seconds, and seeding a
		// substantial catalogue adds tens more — the round-robin sample
		// content templates put multi-block sections behind every session.
		// Both timeouts are generous for that reason, and for that reason
		// alone.
		hookTimeout: 240_000,
		include: [ "tests/**/*.test.ts" ],
		testTimeout: 240_000,
	},
} )
