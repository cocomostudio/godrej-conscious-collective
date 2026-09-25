
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
 | The tickets issued by one Strapi instance, held in memory. A ticket can be
 | redeemed once.
 |
 */
export const tickets = () => {
	const issued = new Map<string, Ticket>()

	return {
		issue ( ticket: Ticket ): string {
			const id = randomBytes( 32 ).toString( "base64url" )
			issued.set( id, ticket )

			return id
		},

		redeem ( id: string ): Ticket | undefined {
			const ticket = issued.get( id )
			issued.delete( id )

			return ticket
		},
	}
}

export type Tickets = ReturnType<typeof tickets>
