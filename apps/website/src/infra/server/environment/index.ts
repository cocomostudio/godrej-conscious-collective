
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
	CMS_PUBLIC_URL: string
	CMS_API_TOKEN: string
	REGISTRATION_TOKEN_SECRET: string
	CALENDAR_LINK_SECRET: string
	TRUST_PROXY: string | number | boolean
	HTTP_SERVER_PORT: number
	SERVER_BUILD_DIR: string
	CLIENT_BUILD_DIR: string
}

/**
 |
 | The CMS's origin **as this server reaches it**. A default is carried here,
 | unlike the secrets, which have none: this one names a machine rather than
 | granting access, and a deployment that forgets it fails on the first page
 | with a connection error rather than quietly working with something insecure.
 |
 | Only this process ever dials it, so it is free to be an address only this
 | process can resolve — a loopback port, a container name, a private host.
 |
 */
const cms_url = process.env.CMS_URL ?? "http://localhost:1337"

const _env: Env = {
	APP_ENV: read_application_environment(),
	CMS_URL: cms_url,
	/**
	 |
	 | The CMS's origin **as a browser reaches it**, which is a different
	 | question and frequently a different answer: `CMS_URL` may be a loopback
	 | port on the deployment's own machine, and a visitor's browser cannot
	 | resolve that. This is the one that goes in front of every `/uploads/…`
	 | path the CMS hands back.
	 |
	 | Unset, it falls back to `CMS_URL` — which is right in development, where
	 | the two are the same machine and the same address.
	 |
	 | Set to the **empty string** deliberately, uploads are addressed relative
	 | to the website's own origin. That is the setting for a deployment whose
	 | reverse proxy forwards `/uploads/` to the CMS: same origin, no second
	 | hostname to publish, and nothing to change when the CMS moves.
	 |
	 */
	CMS_PUBLIC_URL: process.env.CMS_PUBLIC_URL ?? cms_url,
	/**
	 |
	 | The API token the registration relay presents to the CMS, scoped to
	 | creating a Lead and nothing else.
	 |
	 | **No default, deliberately.** A fallback here would be a credential
	 | somebody could ship without meaning to, and the failure it prevents —
	 | registrations quietly not being recorded — is not one anybody notices
	 | from outside. Missing, the relay refuses the submission and says why in
	 | the server's log; the mint endpoint and the rest of the site are
	 | untouched.
	 |
	 */
	CMS_API_TOKEN: process.env.CMS_API_TOKEN ?? "",
	/**
	 |
	 | Signs the registration form token. No default, for the same reason.
	 |
	 | Rotating it invalidates every token already handed out, which costs a
	 | visitor who was mid-form one retry — the overlay mints a fresh token
	 | each time it opens.
	 |
	 */
	REGISTRATION_TOKEN_SECRET: process.env.REGISTRATION_TOKEN_SECRET ?? "",
	/**
	 |
	 | Signs the Add to Calendar links. No default, for the same reason again.
	 |
	 | This one is **visible when it is missing**, unlike the other two: the
	 | endpoint behind those links honours only what it signed, so without a
	 | secret there are no links to mint and the button is not drawn at all.
	 | That is deliberate — a button that 404s on press is worse than one that
	 | is not there — but it does mean a deployment that forgets this loses a
	 | feature rather than degrading quietly.
	 |
	 | Rotating it invalidates every link already in a rendered page. The cost
	 | is one refresh: the links are rebuilt on every render, and nobody holds
	 | one for long.
	 |
	 */
	CALENDAR_LINK_SECRET: process.env.CALENDAR_LINK_SECRET ?? "",
	/**
	 |
	 | Express's `trust proxy` setting, and **false unless a deployment says
	 | otherwise.**
	 |
	 | It decides one thing that matters here: whether `req.ip` is the socket's
	 | address or the client hop named in `X-Forwarded-For`. That header is
	 | trivially forged by anything that is not a browser, so trusting it
	 | unconditionally would hand every rate-limited caller an unlimited supply
	 | of identities — which is a rate limiter that does not limit.
	 |
	 | It is therefore a fact about the deployment, not a preference: a server
	 | with a reverse proxy in front of it must set this, and a server without
	 | one must not. Values are Express's own — `"1"` for one hop, a CIDR
	 | range, `"loopback"`, or `"true"` for all of them.
	 |
	 */
	TRUST_PROXY: read_trust_proxy( process.env.TRUST_PROXY ),
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

/**
 |
 | Unset reads as **false** — no proxy is trusted — which is the safe answer
 | for a server nobody has told anything about. `"true"` and `"false"` are
 | translated because Express takes booleans as well as hop counts and CIDR
 | strings, and an environment variable is only ever a string.
 |
 */
function read_trust_proxy ( raw: string | undefined ) {
	if ( raw === undefined || raw === "" || raw === "false" ) {
		return false
	}

	if ( raw === "true" ) {
		return true
	}

	const hops = Number.parseInt( raw, 10 )

	return String( hops ) === raw ? hops : raw
}

function read_port ( raw: string | undefined, fallback: number ) {
	const parsed = Number.parseInt( raw ?? "", 10 )
	return Number.isInteger( parsed ) ? parsed : fallback
}
