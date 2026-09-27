const fs = require( "node:fs" )
const path = require( "node:path" )
const os = require( "node:os" )

/**
 |
 | PM2, for the website on the staging host.
 |
 |     cd <checkout> && pm2 start infra/staging/website-host/pm2/ecosystem.config.cjs --env staging
 |     pm2 save
 |
 | This is infra/production/website-host/pm2/ecosystem.config.cjs with four
 | differences, because the staging host is not a production host:
 |
 |   - Node comes from mise, not nvm.
 |   - Node is pinned to its major version only.
 |   - The process runs under hard resource limits, because the staging host
 |     also runs the staging deployments of unrelated applications.
 |   - The app reads its settings from `apps/website/.env.staging`, not from
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
 | The website is a low-priority tenant of this host, and PM2 can't enforce
 | that: it has no niceness, CPU or cgroup options (only `uid`/`gid`), and
 | `max_memory_restart` polls RSS every 30s instead of capping it. The kernel
 | can enforce it through cgroups. So the process is launched inside a
 | transient systemd scope with its own limits:
 |
 |     systemd-run --user --scope <limits> -- node <node flags> entry-point.ts
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
 |     systemctl --user status website__godrej-conscious-collective.scope
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
const APP_NAME = "website__godrej-conscious-collective"

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
 | The limits start from a load test of a static build of this same site, on
 | the same stack (React Router on Express, under type stripping), on this
 | host (1 CPU):
 |
 |   - Idle, the process held ~90–110 MB RSS.
 |   - Under load (900 requests, 8 in flight), RSS peaked at ~190 MB with a
 |     48 MB heap. The cgroup's own count (memory.peak), which is what the
 |     limits act on, peaked at ~121 MB.
 |   - A request cost ~30 ms of CPU. Boot cost ~1.6 s of CPU.
 |   - With `--v8-pool-size=1` the process runs 8 threads.
 |
 | This build does more per request than the static one: it fetches each page
 | from the CMS and parses the answer. The heap and memory limits are therefore
 | set one step above the static build's. That margin is an estimate, not a
 | measurement; check `memory.peak` in the scope once staging has real
 | content in it.
 |
 */
const scope_limits = [
	"CPUWeight=1",
	// ↑ the lowest weight cgroups allow; the default is 100. When the CPU
	// 	is contested, the site gets whatever its siblings leave idle.
	"CPUQuota=50%",
	// ↑ half of one core, even when the CPU is otherwise idle. This is the
	// 	floor, and the limit is React Router, not Node. Its default server
	// 	entry aborts any render still running after 6 s (`streamTimeout`
	// 	plus 1 s) and returns a 500. On the static build, 25% crossed that
	// 	line with 8 concurrent requests straight after a restart, and 50%
	// 	did not.
	"MemoryHigh=224M",
	// ↑ above ~224 MB the kernel throttles the process and reclaims its page
	// 	cache, before the hard limit below is reached.
	"MemoryMax=288M",
	// ↑ the hard limit. Past this, the kernel's OOM killer ends the process
	// 	and PM2 restarts it.
	"MemorySwapMax=0",
	// ↑ without this, the process could swap to get around MemoryMax.
	"TasksMax=16",
	// ↑ twice the 8 threads it runs, as a guard against runaway threads.
].flatMap( limit => [ "--property", limit ] )

module.exports = {
	apps: [
		{
			// --- Identity ---
			name: APP_NAME,
			cwd: path.join( repository_root, "apps", "website" ),
			// ↑ the application's own directory rather than the checkout's
			// 	root, because everything the process resolves by relative path
			// 	is relative to this: the `.env.staging` named below, and the
			// 	SERVER_BUILD_DIR / CLIENT_BUILD_DIR defaults the server reads
			// 	its build output from.

			// --- Launcher ---
			script: "entry-point.ts",
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
				"--max-old-space-size=64",
				"--max-semi-space-size=2",
				// ↑ caps the V8 heap one step above the static build's 48 MB
				// 	floor, and shrinks the young generation to match.
				"--v8-pool-size=1",
				// ↑ one background V8 thread instead of four.
				"--env-file-if-exists=.env.staging",
				// ↑ the env-file flag has to be here because it is an argument to
				// 	node, not to the application. Without it, the process starts
				// 	with none of `.env.staging` in it.
			],
			// ↑ PM2 spawns `<interpreter> <interpreter_args> <absolute script>`,
			// 	so the command above ends in `node … entry-point.ts`. That is
			// 	`pnpm -F app.website run start`, without pnpm in between,
			// 	running under the cgroup limits described at the top of this
			// 	file. Because the interpreter isn't node, PM2 also skips its
			// 	own `ProcessContainerFork.js` wrapper, so the production file's
			// 	`source_map_support` would do nothing here. It would have
			// 	nothing to read anyway: the website's build emits no source
			// 	maps.

			// --- Process model ---
			exec_mode: "fork",
			instances: 1,
			autorestart: true,
			watch: false,

			// --- Reliability ---
			max_memory_restart: "256M",
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
			listen_timeout: 15000,
			// ↑ at 50% of a core, a boot that costs ~1.6 s of CPU takes ~3 s
			// 	of wall time, and longer when the CPU is contested.
			shutdown_with_message: true,

			// --- Logging ---
			error_file: required( "WEBSITE_ERROR_LOG" ),
			out_file: required( "WEBSITE_OUT_LOG" ),
			merge_logs: true,
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			time: true,

			// --- Environments ---
			//
			// Deliberately no HTTP_SERVER_PORT here, and no TRUST_PROXY. The app
			// reads apps/website/.env.staging — note the name, which the
			// launcher above spells out. A value set in this block would win
			// over that file, because Node's env-file loading lets an
			// already-set variable stand, so PM2 setting the port would make the
			// app's own file silently dead.
			env: {
				NODE_ENV: "development",
				XDG_RUNTIME_DIR,
			},
			env_staging: {
				NODE_ENV: "production",
				APP_ENV: "production",
				XDG_RUNTIME_DIR,
			},
		},
	],
}
