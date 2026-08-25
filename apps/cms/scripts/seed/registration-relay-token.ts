
/**
 |
 | The API token the website's registration relay carries.
 |
 | A registration is the one row in this CMS a member of the public creates,
 | and it is created by the **website's server** rather than by a browser: the
 | form posts to the website, which relays it here carrying this token. A
 | development database without this row has a registration form that answers
 | 500, which is why the seed plants one.
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
 | So the key is taken from `REGISTRATION_RELAY_TOKEN` — a development value
 | carried in `.env.example` beside the application keys and the token salt,
 | which are development literals for the same reason — and the row is written
 | with `strapi.db.query`. The hashing and the encryption are still the token
 | service's own (`hash` and the encryption service), so nothing here is a copy
 | of logic the service is free to change; only the key's ORIGIN differs.
 |
 | Nothing about this reaches production. The seed refuses to run against
 | anything but local SQLite and refuses outright when `NODE_ENV` is
 | production — see `guards.ts` — so the only database this token can ever be
 | planted in is a developer's own.
 |
 | It is skipped, loudly, when the variable is unset. A missing token is a
 | registration form that answers 500, and finding that out at seed time is
 | better than finding it out from the form.
 |
 */

import type { Strapi } from "./lib/strapi.ts"

export async function write_registration_relay_token ( strapi: Strapi ) {
	const access_key = process.env.REGISTRATION_RELAY_TOKEN

	if ( !access_key ) {
		console.warn(
			`\nREGISTRATION_RELAY_TOKEN is unset, so no API token was created `
				+ `for the registration relay. The form will answer 500 until `
				+ `one exists. Copy apps/cms/.env.example across, or create a `
				+ `token scoped to Lead create in the admin panel.\n`,
		)
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
