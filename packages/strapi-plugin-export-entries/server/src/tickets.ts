
import { randomBytes } from "node:crypto"

import type { Export_Request } from "./request"

/**
 |
 | What the Download endpoint needs to serve a file. The download link cannot
 | carry the admin's login header, so the ticket stands in for it.
 |
 */
export type Ticket = {
	admin: { id: number; email: string }
	request: Export_Request
	/** How many rows the export writes, as counted when the ticket was issued. */
	count: number
	issued_at: number
}

/**
 |
 | How long a ticket waits to be used. The limit covers only the wait: a
 | download that starts in time runs to its end.
 |
 */
const LIFETIME_MS = 60_000

/**
 |
 | The tickets issued by one Strapi instance, held in memory. A ticket can be
 | redeemed once, within its lifetime.
 |
 */
export const tickets = () => {
	const issued = new Map<string, Ticket>()

	const is_expired = ( ticket: Ticket ) =>
		Date.now() - ticket.issued_at > LIFETIME_MS

	return {
		issue ( ticket: Ticket ): string {
			for ( const [ id, earlier ] of issued ) {
				if ( is_expired( earlier ) ) {
					issued.delete( id )
				}
			}

			const id = randomBytes( 32 ).toString( "base64url" )
			issued.set( id, ticket )

			return id
		},

		redeem ( id: string ): Ticket | undefined {
			const ticket = issued.get( id )
			issued.delete( id )

			return ticket && !is_expired( ticket ) ? ticket : undefined
		},
	}
}

export type Tickets = ReturnType<typeof tickets>
