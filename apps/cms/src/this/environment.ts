
/**
 |
 | The deployment environment, and the only thing it is allowed to do.
 |
 | **An environment is a bag of defaults and nothing else.** Every behaviour it
 | influences carries its own variable, so any one of them can be overridden
 | without a deployment having to claim it is a different environment. Running
 | production against SQLite, or with local uploads, or with the sitemap off,
 | are all things somebody eventually needs to do — to reproduce a fault, to
 | stand up a staging box, to stop publishing a sitemap for a site that is not
 | ready to be indexed — and none of them should require lying about `NODE_ENV`
 | or shipping a commit.
 |
 | So nothing here branches on the environment. It branches on a variable, and
 | the environment decides only what that variable falls back to.
 |
 | The seed's guards are the deliberate exception. The value of a guard on a
 | destructive operation is precisely that configuration cannot switch it off,
 | so those stay keyed on the environment directly and take no override.
 |
 | ## Why these readers and not Strapi's `env()`
 |
 | Strapi's helpers test for **presence** — `_.has( process.env, key )` — so a
 | key written and left empty is a value, not an absence. `env.bool( "X", true )`
 | with `X=` in a `.env` file returns `false`, quietly discarding the default it
 | was given. A `.env` file listing every key it knows about, most of them
 | empty, is the normal shape of one, so that reading would make "left empty"
 | mean the opposite of what it says.
 |
 | These treat empty and absent alike, which is what lets an environment's
 | defaults survive being written down.
 |
 | This lives under `src/this/` because that directory is inert — none of
 | Strapi's loaders read it, so a plain module here is not mistaken for a
 | content type, a component or a config namespace.
 |
 | **It imports nothing, and must keep importing nothing.** Two runtimes read
 | it: Strapi, which compiles `src/` and wants extensionless specifiers, and the
 | seed, which runs as a bare `node scripts/seed/index.ts` under type stripping
 | and requires `.ts` on every specifier. A module with no imports of its own
 | can be reached correctly from both — one adds the extension at the import
 | site, the other does not — and a module with imports cannot.
 |
 */

/**
 |
 | An unset `NODE_ENV` is a developer's shell, so it counts as development.
 |
 | The test is for production rather than for development because `strapi
 | develop`, `vitest` and a bare `node` each name themselves differently, and
 | only one name has to be right for a default to be the safe one.
 |
 */
export function is_production (): boolean {
	return ( process.env.NODE_ENV ?? "development" ) === "production"
}

/**
 |
 | What this environment would have a variable fall back to.
 |
 |     configured( "DATABASE_CLIENT" ) ?? environment_default( "postgres", "sqlite" )
 |
 | Both answers on one line, deliberately: a default that is wrong for one
 | environment is visible in review here, rather than a file away in an
 | environment-specific override.
 |
 */
export function environment_default<T> ( in_production: T, otherwise: T ): T {
	return is_production() ? in_production : otherwise
}

/**
 |
 | A variable's value, or `undefined` when nobody has set one.
 |
 | Empty counts as unset. A `.env` file that lists a key and leaves it blank is
 | saying "I know about this and I am not choosing", which is a request for the
 | default rather than a request for the empty string.
 |
 */
export function configured ( key: string ): string | undefined {
	const raw = process.env[key]
	return raw === undefined || raw === "" ? undefined : raw
}

/**
 |
 | A boolean variable, or `fallback` when nobody has set one.
 |
 | **Refuses the boot on anything else**, rather than reading it as false. A
 | flag that is quietly not read is worse than one that is missing: the person
 | who set it believes the override took, and every symptom afterwards points
 | somewhere other than the typo.
 |
 */
export function configured_flag ( key: string, fallback: boolean ): boolean {
	const raw = configured( key )

	if ( raw === undefined ) {
		return fallback
	}

	if ( raw === "true" ) {
		return true
	}

	if ( raw === "false" ) {
		return false
	}

	throw new Error(
		`${key} is "${raw}", which is neither "true" nor "false". Set it to one `
			+ `of those, or empty it to let the environment decide.`,
	)
}

/**
 |
 | A variable constrained to a known set, or `fallback` when nobody has set one.
 |
 | Refuses the boot on anything else, for the same reason as `configured_flag`.
 |
 */
export function configured_choice<T extends string> (
	key: string,
	allowed: readonly T[],
	fallback: T,
): T {
	const raw = configured( key )

	if ( raw === undefined ) {
		return fallback
	}

	if ( ( allowed as readonly string[] ).includes( raw ) ) {
		return raw as T
	}

	throw new Error(
		`${key} is "${raw}", which is not one of ${
			allowed.map( ( value ) => `"${value}"` ).join( ", " )
		}. Set it to one of those, or empty it to let the environment decide.`,
	)
}

/**
 |
 | Which database this instance talks to.
 |
 | Its own variable rather than a reading of the environment, so that a
 | production-mode instance can be pointed at SQLite deliberately — to reproduce
 | a fault against a copy of the data, or to stand something up before a
 | Postgres exists. The environment decides only what it falls back to.
 |
 | **Shared between `config/database.ts` and the seed's guards, and that sharing
 | is the point.** The guard exists to keep the seed off a real database, and it
 | can only do that if "unset" resolves the same way for both. Two copies of
 | `?? "sqlite"` would agree today and drift the first time one of them was
 | thought about.
 |
 | It lives here, rather than in a module of its own, for the import reason
 | above: the seed is one of its two callers.
 |
 | Note that the seed runs as a bare `node` process and does not load `.env`, so
 | it sees only what the shell exports. That is unchanged by this function —
 | both callers read `process.env` and always did — but it is worth knowing that
 | setting `DATABASE_CLIENT` in `.env` does not arm the guard.
 |
 */
export function database_client (): string {
	return configured( "DATABASE_CLIENT" )
		?? environment_default( "postgres", "sqlite" )
}

export const UPLOAD_PROVIDERS = [ "local", "aws-s3" ] as const

export type Upload_Provider = typeof UPLOAD_PROVIDERS[number]

/**
 |
 | Where uploaded files are stored.
 |
 | Its own variable rather than a reading of the environment, because both
 | overrides are things somebody needs: a production-mode instance without S3
 | credentials — a staging box, a local reproduction of a production fault — and
 | a development instance pointed at S3, which is the only way to exercise that
 | provider before it is the one production depends on.
 |
 | Three callers ask this question and would otherwise each carry their own copy
 | of the answer: `config/plugins.ts` chooses the provider, `config/middlewares.ts`
 | names the hosts it serves from in the CSP, and the seed decides how to clear
 | the media library — a directory it can empty itself, or a bucket only the
 | upload plugin can reach. The second follows from the first and not from the
 | environment: a development instance on S3 whose CSP still said "local" would
 | block its own images. The third has to agree with the first or it leaves
 | orphans.
 |
 | It lives here for the import reason in the header, the same one that keeps
 | `database_client` here: the seed is one of its callers.
 |
 */
export function upload_provider (): Upload_Provider {
	return configured_choice(
		"UPLOAD_PROVIDER",
		UPLOAD_PROVIDERS,
		environment_default( "aws-s3", "local" ),
	)
}
