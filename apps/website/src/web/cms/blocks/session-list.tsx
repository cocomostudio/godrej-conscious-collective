
/**
 |
 | Session list — a leaf. The strip of neighbours at the foot of a session:
 | "You might also like".
 |
 | The one **curated** listing in the catalogue. An editor drags sessions into
 | the order they should read in, and this draws them in that order.
 |
 | It does not know that, though, and must not: the CMS resolves a curated
 | relation and an automatic query into the same narrowed rows, so this block
 | receives what the collaborator listing and the session listing receive, and
 | there is one shape rather than two.
 |
 | **The cap is the CMS's.** At most ten rows ever arrive, because the query
 | that fetched them was limited — an eleventh session an editor dragged in is
 | never fetched rather than fetched and then not drawn. The field description
 | says so in the admin.
 |
 | Two columns from the medium breakpoint, one below it, which is the static
 | site's arrangement for this exact strip.
 |
 */

import type { Session_Card } from "../envelope.ts"
import type { Style_And_Transition } from "../cards.tsx"

import { Card } from "../cards.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

export function Session_List (
	{ sessions = [], style_and_transition }: {
		sessions?: Session_Card[]
		style_and_transition?: Style_And_Transition
	},
) {
	if ( sessions.length === 0 ) {
		return null
	}

	return <ul
		className={ `${BLOCK_SPACING} grid grid-cols-1 gap-8 md:grid-cols-2` }>
		{ sessions.map( ( session ) =>
			<li key={ session.documentId }>
				<Card
					session={ session }
					style_and_transition={ style_and_transition } />
			</li>
		) }
	</ul>
}
