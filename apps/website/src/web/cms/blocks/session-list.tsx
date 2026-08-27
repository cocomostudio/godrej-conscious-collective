
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
 | **`normalise_colors` is this block's alone.** A curated strip is where a page
 | most often mixes categories, so it is where a points line drawn in each
 | card's own colour costs the most legibility and buys the least. The session
 | listing and the filtration listing draw one category apiece and were
 | deliberately not given the attribute.
 |
 | It is read as "anything but a stored `false`", rather than defaulted in the
 | signature, for the reason `style_and_transition` is read by comparison rather
 | than by lookup: a schema default is written when a row is written, so every
 | list saved before the attribute existed comes back with nothing in it — and
 | on is what the admin says those have.
 |
 */

import type { Session_Card } from "../envelope.ts"
import type { Style_And_Transition } from "../cards.tsx"

import { Card } from "../cards.tsx"

import { BLOCK_SPACING } from "./block-spacing.ts"

export function Session_List (
	{ normalise_colors, sessions = [], style_and_transition }: {
		normalise_colors?: boolean | null
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
					normalise_colors={ normalise_colors !== false }
					session={ session }
					style_and_transition={ style_and_transition } />
			</li>
		) }
	</ul>
}
