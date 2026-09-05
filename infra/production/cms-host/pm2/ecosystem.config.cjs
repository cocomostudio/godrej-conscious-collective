const path = require( "node:path" )

/**
 |
 | PM2, for the CMS host.
 |
 |     cd <checkout> && pm2 start infra/production/cms-host/pm2/ecosystem.config.cjs --env production
 |     pm2 save
 |
 | Only the CMS is declared here. The website runs on its own machine and has
 | its own file; a host's ecosystem file is a description of that host.
 |
 | ## Reading `.env`
 |
 | This file is plain CommonJS that Node evaluates when `pm2 start` runs, so it
 | can read the host's `.env` itself. Two things follow from *when* that
 | happens:
 |
 |   - The `.env` has to exist on this machine at start time, which is why it is
 |     resolved against `__dirname` rather than the cwd.
 |
 |   - The values are resolved once and then frozen into PM2's dump by
 |     `pm2 save`. `pm2 resurrect` after a reboot replays the saved values; it
 |     does not re-read `.env`. Editing `.env` therefore means running
 |     `pm2 start ... --env production` again and `pm2 save` again.
 |     `pm2 restart --update-env` does NOT do this — it re-reads the calling
 |     shell's environment, not this file.
 |
 */

const env_path = path.join( __dirname, "..", ".env" )

try {
	process.loadEnvFile( env_path )
}
catch {
	throw new Error(
		`ecosystem.config.cjs: no .env at ${env_path} — copy the .env.example beside it and fill it in.`,
	)
}

const repository_root = path.resolve( __dirname, "..", "..", "..", ".." )

/**
 |
 | PM2 stringifies whatever it is given, so a missing key arrives at the
 | application as the literal string "undefined" and is parsed as a path or a
 | port. Failing here, by name, at deploy time is the cheaper failure.
 |
 */
function required ( key ) {
	const value = process.env[ key ]

	if ( value === undefined || value.trim() === "" ) {
		throw new Error(
			`ecosystem.config.cjs: ${key} is missing from ${env_path}`,
		)
	}

	return value.trim()
}

module.exports = {
	apps: [
		{
			// --- Identity ---
			name: "godrej-conscious-collective__cms",
			cwd: repository_root,

			// --- Launcher ---
			script: "pnpm",
			args: "-F app.cms run start",
			interpreter: "none",

			// --- Process model ---
			exec_mode: "fork",
			instances: 1,
			autorestart: true,
			watch: false,

			// --- Reliability ---
			max_memory_restart: "1G",
			min_uptime: "10s",
			max_restarts: 10,
			restart_delay: 4000,
			exp_backoff_restart_delay: 100,

			// --- Graceful launch and shutdown ---
			// Both applications call `process.send( "ready" )` once their
			// server is listening, so PM2 can wait for the port rather than
			// for the process.
			wait_ready: true,
			kill_timeout: 5000,
			listen_timeout: 10000,
			shutdown_with_message: true,

			// --- Logging ---
			error_file: required( "CMS_ERROR_LOG" ),
			out_file: required( "CMS_OUT_LOG" ),
			merge_logs: true,
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			time: true,

			// --- Source maps ---
			source_map_support: true,

			// --- Environments ---
			//
			// Deliberately no PORT here. Strapi reads apps/cms/.env, and a value
			// set in this block would win over it — Node's env-file loading lets
			// an already-set variable stand, so PM2 setting the port would make
			// the app's own file silently dead. The port lives in apps/cms/.env;
			// CMS_PORT in this host's .env exists so nginx knows where to reach
			// it, and the two have to be kept equal by hand.
			env: {
				NODE_ENV: "development",
			},
			env_production: {
				NODE_ENV: "production",
				APP_ENV: "production",

				// Strapi calls `dotenv.config( { path: process.env.ENV_PATH } )`
				// and so reads `apps/cms/.env` unless told otherwise — and that
				// file is the *development* one, written by
				// scripts/ensure-local-env.js from the example on every fresh
				// clone. Production therefore has to name its own file, which
				// also matches how the website's `start` script picks up
				// `.env.production`.
				//
				// Relative to the app's cwd, which is apps/cms because pnpm
				// runs the script there.
				ENV_PATH: ".env.production",
			},
		},
	],
}
