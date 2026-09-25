
import { defineConfig } from "@playwright/test"

import { breakpoints } from "./src/infra/lib/ui/app-shells/primary/breakpoints.ts"

/**
 |
 | The browser tests: what only a browser can show — where things sit and how
 | they move. See docs/decisions/00008-layout-is-checked-in-a-real-browser.md.
 |
 | One project per width, named after the breakpoint it sits at: `sm`,
 | `below-lg` (one pixel below the large breakpoint) and `lg`, each read from
 | the same module Tailwind reads. A test says which widths it is about with a
 | tag of the same name, and each project runs only the tests carrying its own.
 |
 | One worker: every test drives the same server, and one browser at a time
 | keeps a run small. Every test still starts from a fresh page and assumes
 | nothing another test left.
 |
 | Chromium's headless shell is the only browser the tests need. To install it,
 | once per machine, with the system libraries it links against:
 |
 |   pnpm -F app.website exec playwright install --only-shell chromium
 |   sudo pnpm -F app.website exec playwright install-deps chromium
 |
 | To rerun one failing test:
 |
 |   pnpm -F app.website run test:browser --project lg -g "<test name>"
 |
 | and read its trace before changing anything:
 |
 |   pnpm -F app.website exec playwright show-trace test-results/<test>/trace.zip
 |
 */

const PORT = 9101

const SMALL = Number.parseFloat( breakpoints.sm )
const LARGE = Number.parseFloat( breakpoints.lg )

export default defineConfig( {
	fullyParallel: false,
	projects: [
		{
			grep: /@sm\b/,
			name: "sm",
			use: { viewport: { height: 844, width: SMALL } },
		},
		{
			grep: /@below-lg\b/,
			name: "below-lg",
			use: { viewport: { height: 900, width: LARGE - 1 } },
		},
		{
			grep: /@lg\b/,
			name: "lg",
			use: { viewport: { height: 900, width: LARGE } },
		},
	],
	reporter: [ [ "list" ], [ "json", { outputFile: "test-results/results.json" } ] ],
	testDir: "./tests/browser",
	testMatch: "**/*.spec.ts",
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		browserName: "chromium",
		headless: true,
		trace: "retain-on-failure",
	},
	webServer: {
		/**
		 |
		 | `--conditions development`, as the `dev` script has it: this process
		 | loads the server natively and the pages through Vite, and both have
		 | to resolve React Router to the same build.
		 |
		 */
		command: "node --conditions development tests/browser/serve.ts",
		env: { PORT: String( PORT ) },
		name: "website",
		timeout: 120_000,
		url: `http://127.0.0.1:${PORT}/archives`,
	},
	workers: 1,
} )
