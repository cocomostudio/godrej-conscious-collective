
/**
 |
 | Production-only server configuration.
 |
 | Strapi deep-merges this over `config/server.ts`, so only the difference
 | belongs here: **the transfer endpoint is off.**
 |
 | Strapi's Transfer feature pulls the whole database behind a single transfer
 | token — every registrant's name, email address and phone number included, and
 | with none of the three layers protecting the Lead route in its way, because
 | Transfer does not go through the content API at all. Everything this build
 | does to keep that data from leaking through a permission granted by accident
 | is worth exactly nothing while a token that bypasses all of it can be minted
 | from the settings page.
 |
 | So the receiver is disabled, and staying disabled is the resting state.
 | Somebody who actually needs a transfer sets `TRANSFER_REMOTE_ENABLED` for as
 | long as they are using one and unsets it afterwards — which is a deliberate,
 | visible, temporary act, rather than a capability nobody remembers is there.
 |
 | Environment variable rather than a code change, precisely because the person
 | doing it is running against a deployed instance and cannot ship a commit to
 | do it.
 |
 */

import base_server from "../../server"

export default function ( { env } ) {
	return {
		...base_server( { env } ),
		transfer: {
			remote: {
				enabled: env.bool( "TRANSFER_REMOTE_ENABLED", false ),
			},
		},
	}
}
