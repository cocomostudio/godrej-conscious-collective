
/**
 |
 | The API token the website's registration relay carries.
 |
 | A registration is the one row in this CMS a member of the public creates,
 | and it is created by the **website's server** rather than by a browser: the
 | form posts to the website, which relays it here carrying this token. A
 | database without this row has a registration form that answers 500, which is
 | why the seed plants one.
 |
 | Scoped to `api::lead.lead.create` and nothing else, which is the whole of
 | what the relay does. It stays on the website's **server** — the browser never
 | sees it — and the create route's policy is what makes holding it the
 | requirement rather than a convention.
 |
 | ─── WHY THE ROW IS WRITTEN DIRECTLY ────────────────────────────────────────
 |
 | `admin::api-token`'s own `create` mints a random key and hands it back once,
 | in plaintext, and never again. That is exactly right for a token an operator
 | creates in the admin panel, and exactly wrong for a seed that a developer
 | runs several times a day: every reseed would invalidate the website's `.env`
 | and the registration form would be broken until somebody copied a new
 | 256-character string across.
 |
 | So the key is taken from `REGISTRATION_RELAY_TOKEN`, and the row is written
 | with `strapi.db.query`. `.env.example` carries that key as a literal beside
 | the application keys and the token salt, which are literals for the same
 | reason. The hashing and the encryption are still the token service's own
 | (`hash` and the encryption service), so nothing here is a copy of logic the
 | service is free to change; only the key's ORIGIN differs.
 |
 | ─── THIS REACHES PRODUCTION ────────────────────────────────────────────────
 |
 | The seed was once bounded to local SQLite, and it refused outright under a
 | production `NODE_ENV`. That bound is gone, because the seed is now what
 | populates production. What stands in its place is the typed confirmation in
 | `confirmation.ts`, which resolves the target — host, database, schema, and
 | where the media goes — prints it, and asks before anything is destroyed.
 |
 | So the value read here is a real secret on a real host, and the plaintext in
 | that env file is the one that ends up in the database. It has to equal the
 | website's `CMS_API_TOKEN`, or the form answers 401 rather than 500.
 |
 | It is skipped, loudly, when the variable is unset. A missing token is a
 | registration form that answers 500, and finding that out at seed time is
 | better than finding it out from the form.
 |
 */

import { record_failure } from "./report.ts"

import type { Strapi } from "./lib/strapi.ts"

export async function write_registration_relay_token ( strapi: Strapi ) {
	const access_key = process.env.REGISTRATION_RELAY_TOKEN

	if ( !access_key ) {
		console.warn(
			`\nREGISTRATION_RELAY_TOKEN is unset, so no API token was created `
				+ `for the registration relay. The form will answer 500 until `
				+ `one exists. See the report at the end of this run.\n`,
		)

		// Reported and not merely warned about, because this is the one
		// omission here that a person cannot see by looking at the site: every
		// page renders, and the registration form fails only when somebody
		// tries to submit it.
		record_failure( {
			what: "The registration relay's API token",
			where:
				"Settings → API Tokens — a token named \"Registration relay\"",
			why: "REGISTRATION_RELAY_TOKEN was unset in the .env this run read",
			how: [
				`Set REGISTRATION_RELAY_TOKEN in the CMS env file and run the `
				+ `seed again, which is the only way the website's own copy of `
				+ `the token and this one end up equal.`,
				`Or, to avoid a reseed: create a custom token in Settings → `
				+ `API Tokens, named "Registration relay", with no expiry and `
				+ `a single permission — Lead: create.`,
				`Either way the same plaintext has to be the website's `
				+ `REGISTRATION_RELAY_TOKEN, or the form answers 401 instead `
				+ `of 500.`,
			],
		} )

		return
	}

	const tokens = strapi.service( "admin::api-token" )
	const encryption = strapi.service( "admin::encryption" )

	const token = await strapi.db.query( "admin::api-token" ).create( {
		data: {
			accessKey: tokens.hash( access_key ),
			description:
				"The website's registration relay. Scoped to creating a Lead "
				+ "and nothing else, and never sent to a browser.",
			encryptedKey: encryption.encrypt( access_key ),
			lifespan: null,
			name: "Registration relay",
			type: "custom",
		},
	} )

	await strapi.db.query( "admin::api-token-permission" ).create( {
		data: {
			action: "api::lead.lead.create",
			token: token.id,
		},
	} )
}
