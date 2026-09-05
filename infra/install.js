
/**
 |
 | Install one production host's proxy configuration.
 |
 |     node infra/install.js cms-host --dry-run        print, write nothing
 |     sudo node infra/install.js cms-host             write and validate
 |     sudo node infra/install.js cms-host --reload-server
 |
 | Writing and reloading are separate on purpose. A reload is the moment the
 | change becomes live for every request in flight, and that is worth being a
 | decision rather than the tail end of an install. Without --reload-server the
 | files land, `nginx -t` proves they parse, and nginx keeps serving the old
 | configuration until somebody reloads it.
 |
 | Note the consequence: between a bare install and the reload, /etc/nginx holds
 | a configuration nginx has not loaded. Anything that reloads nginx in that
 | window — certbot's renewal hook, a neighbouring app's deploy — applies it.
 | The window is short and the configuration has already passed `nginx -t`, but
 | it is not nothing.
 |
 | ## What it does
 |
 | Everything nginx reads is copied into /etc/nginx rather than included from
 | the checkout. That costs a step and buys one thing: nginx's running
 | configuration only changes when this script says so. Includes pointing into
 | a working copy would change the moment a `git pull` landed, and the next
 | reload would pick it up — certbot's renewal hook runs `nginx -s reload`
 | without asking anybody.
 |
 | ## Why fragments rather than templates
 |
 | The handful of values that vary by deployment are not substituted into the
 | committed configuration. They are written as one-line fragments under
 | /etc/nginx/gcc/ which the committed configuration `include`s. The file you
 | read in git is the file nginx runs, and a missing value fails here — by name
 | — instead of rendering an empty string into a directive.
 |
 | ## Layout it writes
 |
 |     /etc/nginx/conf.d/gcc-<host>.conf   the server block, auto-included by nginx.conf
 |     /etc/nginx/gcc/*.conf               snippets and fragments, included explicitly
 |
 | The fragments deliberately do NOT live in conf.d. Amazon Linux's nginx.conf
 | includes conf.d/*.conf at `http` level, and a stray `server 127.0.0.1:1337;`
 | at `http` level is a syntax error, not a fragment.
 |
 */

import { execFileSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const infra_root = path.dirname( fileURLToPath( import.meta.url ) )
const production_root = path.join( infra_root, "production" )

const NGINX_CONF_D = "/etc/nginx/conf.d"
const NGINX_GCC = "/etc/nginx/gcc"

/**
 |
 | The volatile lines, per host.
 |
 | Each entry names a file under /etc/nginx/gcc/ and the single directive it
 | contains. The committed configuration includes it at the point where that
 | directive is legal — inside `upstream`, inside `server` — which is why these
 | are separate one-line files rather than one file of settings.
 |
 */
const fragments = {
	"cms-host": {
		"cms-upstream.conf": ( env ) =>
			`server 127.0.0.1:${env.port( "CMS_PORT" )};`,
		"cms-server-name.conf": ( env ) =>
			`server_name ${env.host_name( "CMS_SERVER_NAME" )};`,
	},
	"website-host": {
		"website-upstream.conf": ( env ) =>
			`server 127.0.0.1:${env.port( "WEBSITE_PORT" )};`,
		"website-server-name.conf": ( env ) =>
			`server_name ${env.host_name( "WEBSITE_SERVER_NAME" )};`,
		"website-frame-ancestors.conf": ( env ) =>
			`add_header Content-Security-Policy "frame-ancestors 'self' ${
				env.origin( "CMS_ORIGIN" )
			}" always;`,
	},
}

const [ host, ...flags ] = process.argv.slice( 2 )
const dry_run = flags.includes( "--dry-run" )
const reload_server = flags.includes( "--reload-server" )

main()

function main () {
	if ( !host || !( host in fragments ) ) {
		fail(
			`Usage: sudo node infra/install.js <${
				Object.keys( fragments ).join( " | " )
			}> [--dry-run] [--reload-server]`,
		)
	}

	if ( !dry_run && process.getuid() !== 0 ) {
		fail(
			"This writes under /etc/nginx. Run it with sudo, or pass --dry-run.",
		)
	}

	const env = load_environment( path.join( production_root, host, ".env" ) )

	const writes = [
		...Object.entries( fragments[host] ).map( ( [ name, build ] ) => ( {
			target: path.join( NGINX_GCC, name ),
			content: `${build( env )}\n`,
		} ) ),
		...[
			"proxy-headers.conf",
			"websocket-upgrade-map.conf",
			"forwarded-proto-map.conf",
		]
			.map( (
				name,
			) => ( {
				target: path.join( NGINX_GCC, name ),
				content: readFileSync(
					path.join( production_root, "shared", "nginx", name ),
					"utf8",
				),
			} ) ),
		{
			target: path.join(
				NGINX_CONF_D,
				`gcc-${host.replace( "-host", "" )}.conf`,
			),
			content: readFileSync(
				path.join(
					production_root,
					host,
					"nginx",
					`gcc-${host.replace( "-host", "" )}.conf`,
				),
				"utf8",
			),
		},
	]

	if ( dry_run ) {
		for ( const write of writes ) {
			console.log( `\n--- ${write.target} ---\n${write.content}` )
		}
		return
	}

	mkdirSync( NGINX_GCC, { recursive: true } )

	const rollback = writes.map( ( write ) => ( {
		target: write.target,
		previous: existsSync( write.target )
			? readFileSync( write.target, "utf8" )
			: null,
	} ) )

	for ( const write of writes ) {
		writeFileSync( write.target, write.content, { mode: 0o644 } )
		console.log( `Wrote ${write.target}` )
	}

	try {
		execFileSync( "nginx", [ "-t" ], { stdio: "inherit" } )
	}
	catch {
		restore( rollback )
		fail(
			"`nginx -t` rejected the configuration. Everything this run wrote has been rolled back.",
		)
	}

	if ( !reload_server ) {
		console.log(
			"\nConfiguration is in place and `nginx -t` accepts it, but nginx is still\n"
				+ "running the previous one. Apply it when you are ready:\n\n"
				+ "    sudo systemctl reload nginx\n\n"
				+ "Or pass --reload-server to have this script do it.",
		)
		return
	}

	execFileSync( "systemctl", [ "reload", "nginx" ], { stdio: "inherit" } )
	console.log( `\nnginx reloaded for ${host}.` )
}

/**
 |
 | Read the host's `.env` and hand back typed readers rather than raw strings.
 |
 | These values are interpolated into an nginx configuration, so a `;` or a
 | newline in the wrong place is not a typo — it is another directive. The
 | readers are as much about that as about catching a missing key.
 |
 */
function load_environment ( env_path ) {
	if ( !existsSync( env_path ) ) {
		fail(
			`No .env at ${env_path} — copy the .env.example beside it and fill it in.`,
		)
	}

	process.loadEnvFile( env_path )

	const required = ( key ) => {
		const value = process.env[key]

		if ( value === undefined || value.trim() === "" ) {
			fail( `${key} is missing from ${env_path}` )
		}

		return value.trim()
	}

	return {
		port ( key ) {
			const value = required( key )

			if (
				!/^\d+$/.test( value ) || Number( value ) < 1
				|| Number( value ) > 65535
			) {
				fail( `${key} in ${env_path} is not a port: ${value}` )
			}

			return value
		},

		host_name ( key ) {
			const value = required( key )

			if (
				!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i
					.test( value )
			) {
				fail(
					`${key} in ${env_path} is not a bare host name: ${value}`,
				)
			}

			return value
		},

		origin ( key ) {
			const value = required( key )

			if ( !/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test( value ) ) {
				fail(
					`${key} in ${env_path} is not an origin — scheme, host, optional port, no trailing slash: ${value}`,
				)
			}

			return value
		},
	}
}

function restore ( rollback ) {
	for ( const entry of rollback ) {
		if ( entry.previous === null ) {
			unlinkSync( entry.target )
		}
		else {
			writeFileSync( entry.target, entry.previous )
		}
	}
}

function fail ( message ) {
	console.error( `\ninfra/install.js: ${message}\n` )
	process.exit( 1 )
}
