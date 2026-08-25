
import { defineConfig } from "vitest/config"

export default defineConfig( {
	test: {
		// Strapi keeps global state — `global.strapi`, the database connection,
		// the plugin registries — so two instances must never be alive at once.
		fileParallelism: false,
		// Compiling the application and seeding the content are both done
		// once for the whole run rather than once per file — see
		// `tests/support/global-setup.ts`, which leaves a seeded database
		// behind for every file to copy.
		globalSetup: [ "tests/support/global-setup.ts" ],
		// Booting a Strapi instance still takes several seconds per file, and
		// the global setup above pays for a compile and a seed on top before
		// the first one. Both timeouts are generous for that reason, and for
		// that reason alone.
		hookTimeout: 240_000,
		include: [ "tests/**/*.test.ts" ],
		testTimeout: 240_000,
	},
} )
