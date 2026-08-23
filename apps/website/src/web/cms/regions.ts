
/**
 |
 | What counts as a region.
 |
 | A region is an array whose members carry the `__component` discriminator.
 | Two things it deliberately excludes:
 |
 |   • a **repeatable component list**, which is an array without the
 |     discriminator — the marquee's items and the sponsors list are these, and
 |     they arrive as raw data for a block to do what it likes with; and
 |
 |   • a `content` attribute that happens to be a **string**, which is exactly
 |     what the plain string holds.
 |
 | Both the renderer and the table of contents ask this question, and they must
 | not answer it differently: one walks a region and the other collects from it,
 | and a disagreement would show up as an entry in the table of contents that
 | points at nothing rendered, or the reverse.
 |
 */

import type { Block } from "./envelope.ts"

export function is_region ( value: unknown ): value is Block[] {
	return Array.isArray( value )
		&& value.every( ( item ) =>
			typeof ( item as Block )?.__component === "string"
		)
}
