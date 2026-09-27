const fs = require( "node:fs" )
const path = require( "node:path" )
const os = require( "node:os" )

/**
 |
 | PM2, for the CMS on the staging host.
 |
 |     cd <checkout> && pm2 start infra/staging/cms-host/pm2/ecosystem.config.cjs --env staging
 |     pm2 save
 |
 | This is infra/production/cms-host/pm2/ecosystem.config.cjs with four
 | differences, because the staging host is not a production host:
 |
 |   - Node comes from mise, not nvm.
 |   - Node is pinned to its major version only.
 |   - The process runs under hard resource limits, because the staging host
 |     also runs the staging deployments of unrelated applications.
 |   - The app reads its settings from `apps/cms/.env.staging`, not from
 |     `.env.production`.
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
 |     `pm2 start ... --env staging` again and `pm2 save` again.
 |     `pm2 restart --update-env` does NOT do this — it re-reads the calling
 |     shell's environment, not this file.
 |
 | ## Resource caps
 |
 | The CMS is a low-priority tenant of this host, and PM2 can't enforce that:
 | it has no niceness, CPU or cgroup options (only `uid`/`gid`), and
 | `max_memory_restart` polls RSS every 30s instead of capping it. The kernel
 | can enforce it through cgroups. So the process is launched inside a
 | transient systemd scope with its own limits:
 |
 |     systemd-run --user --scope <limits> -- node <node flags> strapi.js start
 |
 | This works under PM2 because `systemd-run --scope` registers the scope and
 | then exec()s the command in its own process. Node therefore keeps the PID
 | PM2 spawned, the IPC channel PM2 opened (so `wait_ready` still works) and
 | the environment PM2 passed. PM2 still signals, monitors and restarts that
 | PID as usual.
 |
 | `--user` means this user's systemd instance creates the scope, so no root
 | is needed. Two host requirements follow:
 |
 |   - The user's systemd instance must be running when PM2 starts the app,
 |     including at boot, before anyone logs in. That requires lingering:
 |     `sudo loginctl enable-linger <user>`. This file refuses to load
 |     without it.
 |
 |   - At boot, `pm2 resurrect` must run after that instance is up. Add
 |     `After=user@<uid>.service` and `Wants=user@<uid>.service` to the unit
 |     that `pm2 startup` generated. Without these lines, the first spawn can
 |     fail. PM2 then retries it with backoff.
 |
 | To inspect it on the host:
 |     systemctl --user status cms__godrej-conscious-collective.scope
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
const NODE_VERSION = "24"
// ↑ mise resolves `24` to the newest 24.x it has installed.
const APP_NAME = "cms__godrej-conscious-collective"

/**
 |
 | `systemd-run --user` finds the user's systemd instance through
 | $XDG_RUNTIME_DIR. A login shell has that variable. A boot-time
 | `pm2 resurrect` may not, so it is pinned below rather than inherited. The
 | bus socket only exists while the instance is running. Checking for it here
 | turns a missing `enable-linger` into a deploy-time error instead of a
 | restart loop after the next reboot.
 |
 */
const XDG_RUNTIME_DIR = `/run/user/${ os.userInfo().uid }`

if ( !fs.existsSync( path.join( XDG_RUNTIME_DIR, "bus" ) ) ) {
	throw new Error(
		`ecosystem.config.cjs: no systemd user instance at ${XDG_RUNTIME_DIR} — run \`sudo loginctl enable-linger ${os.userInfo().username}\`.`,
	)
}

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

/**
 |
 | The limits come from measuring `strapi start` in production mode on this
 | host (1 CPU), against an empty SQLite database:
 |
 |   - Idle, the process holds ~220 MB RSS with a 160 MB heap cap.
 |   - 800 admin API requests, 8 in flight, peaked at ~270 MB RSS. A request
 |     costs ~50–80 ms of CPU.
 |   - Uploading a 17-megapixel JPEG peaked at ~405 MB RSS. Strapi resizes
 |     every upload into several formats, and that work happens outside the
 |     V8 heap, so no heap cap bounds it. An upload costs ~5 s of CPU.
 |   - Boot costs ~14 s of CPU.
 |   - With `--v8-pool-size=1`, the process runs 8 threads, and up to 11 while
 |     it resizes an upload.
 |
 */
const scope_limits = [
	"CPUWeight=1",
	// ↑ the lowest weight cgroups allow; the default is 100. When the CPU
	// 	is contested, the CMS gets whatever its siblings leave idle.
	"CPUQuota=50%",
	// ↑ half of one core, even when the CPU is otherwise idle. A boot then
	// 	takes ~30 s of wall time, and a large upload ~10 s.
	"MemoryHigh=448M",
	// ↑ above ~448 MB the kernel throttles the process and reclaims its page
	// 	cache, before the hard limit below is reached.
	"MemoryMax=512M",
	// ↑ the hard limit. Past this, the kernel's OOM killer ends the process
	// 	and PM2 restarts it.
	"MemorySwapMax=0",
	// ↑ without this, the process could swap to get around MemoryMax.
	"TasksMax=24",
	// ↑ twice the 11 threads it runs at most, as a guard against runaway
	// 	threads.
].flatMap( limit => [ "--property", limit ] )

module.exports = {
	apps: [
		{
			// --- Identity ---
			name: APP_NAME,
			cwd: path.join( repository_root, "apps", "cms" ),
			// ↑ the application's own directory rather than the checkout's
			// 	root, because everything else here is relative to it: the
			// 	script below, the `ENV_PATH` further down, and Strapi's own
			// 	idea of where the application it is booting lives, which it
			// 	takes from the working directory.

			// --- Launcher ---
			script: "node_modules/@strapi/strapi/bin/strapi.js",
			args: "start",
			interpreter: "systemd-run",
			interpreter_args: [
				"--user",
				"--scope",
				"--quiet",
				"--collect",
				// ↑ unloads the scope even when the process died by a signal or
				// 	the OOM killer, so the fixed unit name below is free for
				// 	PM2's next spawn.
				"--unit", APP_NAME,
				...scope_limits,
				"--",
				"choom", "-n", "1000", "--",
				// ↑ if the whole host runs out of memory, the kernel kills this
				// 	process before any other.
				`${ os.homedir() }/.local/share/mise/installs/node/${ NODE_VERSION }/bin/node`,
				"--max-old-space-size=192",
				// ↑ a 160 MB heap served every measurement above. The extra
				// 	32 MB is margin for content that outgrows the test data.
				"--v8-pool-size=1",
				// ↑ one background V8 thread instead of four.
			],
			// ↑ PM2 spawns `<interpreter> <interpreter_args> <absolute script>
			// 	<args>`, so the command above ends in `node … strapi.js start`.
			// 	That is `pnpm -F app.cms run start`, without pnpm in between,
			// 	running under the cgroup limits described at the top of this
			// 	file. Because the interpreter isn't node, PM2 also skips its
			// 	own `ProcessContainerFork.js` wrapper, so the production file's
			// 	`source_map_support` would do nothing here. It would have
			// 	nothing to read anyway: the CMS's build emits no source maps.

			// --- Process model ---
			exec_mode: "fork",
			instances: 1,
			autorestart: true,
			watch: false,

			// --- Reliability ---
			max_memory_restart: "480M",
			// ↑ between MemoryHigh and MemoryMax. When PM2's 30-second poll
			// 	sees RSS above this, it restarts the process gracefully before
			// 	the kernel has to kill it.
			min_uptime: "10s",
			max_restarts: 10,
			restart_delay: 4000,
			exp_backoff_restart_delay: 100,

			// --- Graceful launch and shutdown ---
			// The application calls `process.send( "ready" )` once its server
			// is listening, so PM2 can wait for the port rather than for the
			// process.
			wait_ready: true,
			kill_timeout: 5000,
			listen_timeout: 60000,
			// ↑ at 50% of a core, a boot that costs ~14 s of CPU takes ~30 s
			// 	of wall time, and longer when the CPU is contested.
			shutdown_with_message: true,

			// --- Logging ---
			error_file: required( "CMS_ERROR_LOG" ),
			out_file: required( "CMS_OUT_LOG" ),
			merge_logs: true,
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			time: true,

			// --- Environments ---
			//
			// Deliberately no PORT here. Strapi reads apps/cms/.env.staging,
			// and a value set in this block would win over it — Node's env-file
			// loading lets an already-set variable stand, so PM2 setting the
			// port would make the app's own file silently dead.
			env: {
				NODE_ENV: "development",
				XDG_RUNTIME_DIR,
			},
			env_staging: {
				NODE_ENV: "production",
				APP_ENV: "production",
				XDG_RUNTIME_DIR,

				// Strapi calls `dotenv.config( { path: process.env.ENV_PATH } )`
				// and so reads `apps/cms/.env` unless told otherwise — and that
				// file is the *development* one, written by
				// scripts/ensure-local-env.js from the example on every fresh
				// clone. Staging therefore has to name its own file.
				//
				// Relative to the app's cwd, which the launcher above sets to
				// apps/cms.
				ENV_PATH: ".env.staging",
			},
		},
	],
}
