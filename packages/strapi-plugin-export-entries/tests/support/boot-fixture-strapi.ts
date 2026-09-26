import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"

import plugin_server from "../../server/src/index"

/**
 |
 | Boots a real Strapi instance over a throwaway application, with this plugin
 | installed and a set of made-up content-types.
 |
 | Both test seams start here. A refused boot is observed as `load()`
 | rejecting, because a refused boot serves nothing. A boot that succeeds goes
 | on to listen, and the tests then drive it over HTTP the way the admin panel
 | does.
 |
 | The content-types are invented on purpose. A plugin that passes against
 | them is not tied to any one CMS.
 |
 | Strapi `require`s a plugin's `strapi-server.js` itself, outside the test
 | runner, so it cannot load the plugin's TypeScript. The fixture's
 | `strapi-server.js` therefore reaches for the plugin through a global that
 | this module sets, and the plugin under test is the source rather than a
 | build of it.
 |
 */

/**
 |
 | Strapi ships both a CommonJS and an ES module build, and the ES module build
 | is broken: it carries extensionless directory imports that Node's ESM loader
 | refuses. Requiring the package pins the working half.
 |
 */
const { createStrapi } = createRequire( import.meta.url )( "@strapi/strapi" )

const PLUGIN_HANDLE = "__export_entries_fixture_plugin__"

export const SUPER_ADMIN = {
	email: "super@example.com",
	password: "Fixture-password-1",
}

type Fixture_Options = {
	/** Keyed by singular API name, e.g. `thing` for `api::thing.thing`. */
	content_types?: Record<string, unknown>
	/** Keyed by full component uid, e.g. `parts.bit`. */
	components?: Record<string, unknown>
	/** What `config/plugins.ts` would set for this plugin. */
	plugin_config?: Record<string, unknown>
	/** Environment variables to set for the boot, and put back afterwards. */
	env?: Record<string, string | undefined>
	/** The public URL the server is reached at, as `config/server.ts` sets it. */
	server_url?: string
}

export type Fixture_Strapi = {
	strapi: any
	/** Absolute base URL of the running instance. */
	url: string
	destroy: () => Promise<void>
	/** Creates an active admin holding the given role, and returns its email. */
	create_admin: ( email: string, role_id: number ) => Promise<string>
	/** Creates a role holding the given permissions, and returns its id. */
	create_role: ( name: string, permissions: unknown[] ) => Promise<number>
	/** Logs an admin in through the admin login endpoint. */
	login: ( email: string ) => Promise<string>
	/** Sends a request, with a bearer token when one is given. */
	request: (
		method: string,
		path: string,
		options?: { token?: string; body?: unknown },
	) => Promise<{ status: number; body: any }>
}

export async function boot_fixture_strapi (
	options: Fixture_Options = {},
): Promise<Fixture_Strapi> {
	const restore_env = set_env( options.env ?? {} )
	const app_dir = write_fixture_app( options )
	;( globalThis as any )[PLUGIN_HANDLE] = plugin_server

	const strapi = createStrapi( { appDir: app_dir, distDir: app_dir } )

	const destroy = async () => {
		delete ( globalThis as any )[PLUGIN_HANDLE]
		await destroy_strapi( strapi )
		fs.rmSync( app_dir, { force: true, recursive: true } )
		restore_env()
	}

	try {
		await strapi.load()
		await strapi.listen()
	} catch ( error ) {
		await destroy()
		throw error
	}

	const { port } = strapi.server.httpServer.address()
	const url = `http://127.0.0.1:${port}`

	const request: Fixture_Strapi["request"] = async (
		method,
		path,
		{ token, body } = {},
	) => {
		const response = await fetch( `${url}${path}`, {
			body: body === undefined ? undefined : JSON.stringify( body ),
			headers: {
				...( body === undefined
					? {}
					: { "content-type": "application/json" } ),
				...( token ? { authorization: `Bearer ${token}` } : {} ),
			},
			method,
		} )
		const text = await response.text()

		return {
			body: text ? JSON.parse( text ) : null,
			status: response.status,
		}
	}

	const create_admin: Fixture_Strapi["create_admin"] = async (
		email,
		role_id,
	) => {
		await strapi.service( "admin::user" ).create( {
			email,
			firstname: email.split( "@" )[0],
			isActive: true,
			password: SUPER_ADMIN.password,
			registrationToken: null,
			roles: [ role_id ],
		} )

		return email
	}

	const create_role: Fixture_Strapi["create_role"] = async (
		name,
		permissions,
	) => {
		const roles = strapi.service( "admin::role" )
		const role = await roles.create( { description: name, name } )
		await roles.assignPermissions( role.id, permissions )

		return role.id
	}

	const login: Fixture_Strapi["login"] = async ( email ) => {
		const { body, status } = await request( "POST", "/admin/login", {
			body: { email, password: SUPER_ADMIN.password },
		} )

		if ( status !== 200 ) {
			throw new Error( `Logging ${email} in answered ${status}.` )
		}

		return body.data.token
	}

	const super_admin_role = await strapi.service( "admin::role" )
		.getSuperAdmin()
	await create_admin( SUPER_ADMIN.email, super_admin_role.id )

	return {
		create_admin,
		create_role,
		destroy,
		login,
		request,
		strapi,
		url,
	}
}

function set_env ( values: Record<string, string | undefined> ) {
	const previous = Object.fromEntries(
		Object.keys( values ).map( ( key ) => [ key, process.env[key] ] ),
	)

	assign_env( values )

	return () => assign_env( previous )
}

function assign_env ( values: Record<string, string | undefined> ) {
	for ( const [ key, value ] of Object.entries( values ) ) {
		if ( value === undefined ) {
			delete process.env[key]
		} else {
			process.env[key] = value
		}
	}
}

function write_fixture_app ( options: Fixture_Options ) {
	const app_dir = fs.mkdtempSync(
		path.join( os.tmpdir(), "export-entries-fixture-" ),
	)

	write(
		app_dir,
		"package.json",
		JSON.stringify( {
			dependencies: {},
			name: "export-entries-fixture",
			strapi: { telemetryDisabled: true },
			version: "0.0.0",
		} ),
	)

	write(
		app_dir,
		"config/server.js",
		`module.exports = () => ( {\n`
			+ `\tapp: { keys: [ "fixture-key-one", "fixture-key-two" ] },\n`
			+ `\thost: "127.0.0.1",\n`
			+ `\tport: 0,\n`
			+ ( options.server_url
				? `\turl: ${JSON.stringify( options.server_url )},\n`
				: "" )
			+ `} )\n`,
	)

	write(
		app_dir,
		"config/admin.js",
		`module.exports = () => ( {\n`
			+ `\tapiToken: { salt: "fixture-api-token-salt" },\n`
			+ `\tauth: { secret: "fixture-admin-jwt-secret" },\n`
			// The login limit's window is measured on the clock, and a test that
			// freezes the clock would never see the window close.
			+ `\trateLimit: { enabled: false },\n`
			+ `\tsecrets: { encryptionKey: "fixture-encryption-key-0123456789" },\n`
			+ `\ttransfer: { token: { salt: "fixture-transfer-token-salt" } },\n`
			+ `} )\n`,
	)

	write(
		app_dir,
		"config/database.js",
		`const path = require( "node:path" )\n\n`
			+ `module.exports = () => ( {\n`
			+ `\tconnection: {\n`
			+ `\t\tclient: "sqlite",\n`
			+ `\t\tconnection: { filename: path.join( __dirname, "..", "database.db" ) },\n`
			+ `\t\tuseNullAsDefault: true,\n`
			+ `\t},\n`
			+ `} )\n`,
	)

	write(
		app_dir,
		"config/plugins.js",
		`module.exports = () => ( ${
			JSON.stringify( {
				"export-entries": {
					config: options.plugin_config ?? {},
					enabled: true,
					resolve: path.join( app_dir, "plugins", "export-entries" ),
				},
			} )
		} )\n`,
	)

	write(
		app_dir,
		"plugins/export-entries/package.json",
		JSON.stringify( {
			name: "export-entries-fixture-plugin",
			strapi: { kind: "plugin", name: "export-entries" },
			version: "0.0.0",
		} ),
	)

	write(
		app_dir,
		"plugins/export-entries/strapi-server.js",
		`module.exports = globalThis[ "${PLUGIN_HANDLE}" ]\n`,
	)

	write(
		app_dir,
		"src/index.js",
		`module.exports = { register () {}, bootstrap () {} }\n`,
	)

	write( app_dir, "public/uploads/.gitkeep", "" )
	write( app_dir, "favicon.png", "" )

	for (
		const [ name, schema ] of Object.entries( options.content_types ?? {} )
	) {
		write(
			app_dir,
			`src/api/${name}/content-types/${name}/schema.json`,
			JSON.stringify( schema, null, "\t" ),
		)
	}

	for (
		const [ uid, schema ] of Object.entries( options.components ?? {} )
	) {
		const [ category, name ] = uid.split( "." )
		write(
			app_dir,
			`src/components/${category}/${name}.json`,
			JSON.stringify( schema, null, "\t" ),
		)
	}

	return app_dir
}

function write ( app_dir: string, relative_path: string, contents: string ) {
	const file = path.join( app_dir, relative_path )
	fs.mkdirSync( path.dirname( file ), { recursive: true } )
	fs.writeFileSync( file, contents )
}

/**
 |
 | Puts a booted Strapi down, and puts the process back as it found it.
 |
 | `strapi.destroy()` ends with a bare `process.removeAllListeners()`, which
 | takes the test runner's own IPC listeners with it and leaves the worker
 | looking as though it crashed. The listeners are captured before and put back
 | after. A failure to destroy is swallowed: the process is going away anyway,
 | and a throw here would be reported as the test's failure rather than as the
 | teardown's.
 |
 */
async function destroy_strapi (
	strapi: { destroy: () => Promise<unknown> },
) {
	const captured = process.eventNames().map( ( event ) => ( {
		event,
		listeners: process.rawListeners( event ),
	} ) )

	try {
		await strapi.destroy()
	} catch {
		// Deliberately ignored — see above.
	} finally {
		for ( const { event, listeners } of captured ) {
			for ( const listener of listeners ) {
				if ( !process.rawListeners( event ).includes( listener ) ) {
					process.on(
						event,
						listener as ( ...args: any[] ) => void,
					)
				}
			}
		}
	}
}
