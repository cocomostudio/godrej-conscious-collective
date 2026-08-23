
/**
 |
 | Server environment.
 |
 | Read once at module evaluation. ESM guarantees this settles before any
 | importer's code runs, so there is no setup ordering to get wrong.
 |
 */

const ENVIRONMENTS = {
	DEVELOPMENT: "development",
	PRODUCTION: "production",
} as const

type ApplicationEnvironment = typeof ENVIRONMENTS[keyof typeof ENVIRONMENTS]

type Env = {
	APP_ENV: ApplicationEnvironment
	CMS_URL: string
	HTTP_SERVER_PORT: number
	SERVER_BUILD_DIR: string
	CLIENT_BUILD_DIR: string
}

const _env: Env = {
	APP_ENV: read_application_environment(),
	// The CMS's origin. A default is carried here, unlike the secrets, which
	// have none: this one names a machine rather than granting access, and a
	// deployment that forgets it fails on the first page with a connection
	// error rather than quietly working with something insecure.
	CMS_URL: process.env.CMS_URL ?? "http://localhost:1337",
	HTTP_SERVER_PORT: read_port( process.env.HTTP_SERVER_PORT, 9001 ),
	SERVER_BUILD_DIR: process.env.SERVER_BUILD_DIR ?? "./build/server",
	CLIENT_BUILD_DIR: process.env.CLIENT_BUILD_DIR ?? "./build/client",
}

export const Environment = {
	get,
	ENVIRONMENTS,
	is_development,
}

function get<T extends keyof Env> ( key: T ): Env[T] {
	return _env[key]
}

function is_development () {
	return _env.APP_ENV === ENVIRONMENTS.DEVELOPMENT
}

function read_application_environment (): ApplicationEnvironment {
	const raw = process.env.APP_ENV ?? process.env.NODE_ENV
	return raw === ENVIRONMENTS.PRODUCTION
		? ENVIRONMENTS.PRODUCTION
		: ENVIRONMENTS.DEVELOPMENT
}

function read_port ( raw: string | undefined, fallback: number ) {
	const parsed = Number.parseInt( raw ?? "", 10 )
	return Number.isInteger( parsed ) ? parsed : fallback
}
