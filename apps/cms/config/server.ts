
import {
	configured,
	configured_flag,
	environment_default,
} from "../src/this/environment"

/**
 |
 | Server.
 |
 | There is no production counterpart to this file. What used to live in one —
 | the transfer receiver — is a variable now, and the proxy settings a
 | deployment behind a reverse proxy needs have joined it.
 |
 */

export default function ( { env } ) {
	const hops = trust_proxy_hops()

	return {
		host: env( "HOST", "0.0.0.0" ),
		port: env.int( "PORT", 1337 ),
		app: {
			keys: env.array( "APP_KEYS" ),
		},
		/**
		 |
		 | Koa ignores `X-Forwarded-*` entirely until told not to, so without
		 | this `ctx.ip` is the proxy on every request.
		 |
		 | `maxIpsCount` is the half that matters. Koa reads the **leftmost**
		 | entry of `X-Forwarded-For` as the client, and a load balancer appends
		 | rather than replaces — so a caller who sends the header themselves
		 | gets their own value preserved in front of the real one. Limiting the
		 | read to the last `n` hops discards anything prepended by whoever is
		 | calling.
		 |
		 */
		proxy: {
			koa: hops > 0,
			maxIpsCount: hops,
		},
		/**
		 |
		 | Strapi's Transfer feature pulls the whole database behind a single
		 | transfer token — every registrant's name, email address and phone
		 | number included, and with none of the three layers protecting the
		 | Lead route in its way, because Transfer does not go through the
		 | content API at all. Everything this build does to keep that data from
		 | leaking through a permission granted by accident is worth exactly
		 | nothing while a token that bypasses all of it can be minted from the
		 | settings page.
		 |
		 | So the receiver is off in production, and staying off is the resting
		 | state. Somebody who actually needs a transfer sets
		 | `TRANSFER_REMOTE_ENABLED` for as long as they are using one and unsets
		 | it afterwards — a deliberate, visible, temporary act rather than a
		 | capability nobody remembers is there.
		 |
		 | On elsewhere, which is Strapi's own default and the right one for a
		 | database full of seed data.
		 |
		 | The variable is read in every environment, unlike before, when it was
		 | named in a production-only file and therefore did nothing anywhere
		 | else.
		 |
		 */
		transfer: {
			remote: {
				enabled: configured_flag(
					"TRANSFER_REMOTE_ENABLED",
					environment_default( false, true ),
				),
			},
		},
	}
}

/**
 |
 | How many proxies stand in front of this server.
 |
 | **No environment default: zero everywhere unless a deployment says
 | otherwise.** Both mistakes are bad, and they are not symmetric. Trusting a
 | header nobody set lets any caller claim any address; not trusting one that is
 | set makes every caller share the proxy's address. The first is a
 | vulnerability and the second is a degradation, so the safe direction is to
 | trust nothing until told, in production as much as anywhere.
 |
 | A count rather than a boolean, and no CIDR or `"loopback"` forms, because Koa
 | takes a count and a boolean and nothing else — narrower than the website's
 | `TRUST_PROXY`, which is Express's and accepts more.
 |
 */
function trust_proxy_hops (): number {
	const raw = configured( "TRUST_PROXY" )

	if ( raw === undefined ) {
		return 0
	}

	const hops = Number.parseInt( raw, 10 )

	if ( String( hops ) !== raw || hops < 0 ) {
		throw new Error(
			`TRUST_PROXY is "${raw}", which is not a count of proxies. Set it to `
				+ `a whole number — 2 for a reverse proxy behind a load balancer `
				+ `— or empty it to trust none.`,
		)
	}

	return hops
}
