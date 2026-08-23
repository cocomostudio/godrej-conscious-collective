
/**
 |
 | Every block the website knows how to render.
 |
 | A component the CMS holds and this map does not is **not an error**. The
 | catalogue grows in the CMS before it grows here — that is the normal state of
 | this build — so the renderer leaves a gap on the page and says so in the
 | console rather than taking the page down.
 |
 | `regions` is declared only by a block with **more than one** region, because
 | the attribute-to-prop mapping is a property of the block rather than of the
 | schema. A block with one region names it `content` and receives it as
 | `children`, with no declaration and no rename.
 |
 */

import type { ComponentType } from "react"

import { Back_Link } from "./blocks/back-link.tsx"
import { Heading } from "./blocks/heading.tsx"
import { Plain_String } from "./blocks/plain-string.tsx"
import { Root } from "./blocks/root.tsx"
import { Section } from "./blocks/section.tsx"
import { Table_Of_Contents } from "./blocks/table-of-contents.tsx"
import {
	BACK_LINK,
	ROOT,
	TABLE_OF_CONTENTS,
} from "./assemble-root.ts"

type Registered = {
	Renderer: ComponentType<any>
	regions?: string[]
}

export const BLOCK_REGISTRY: Record<string, Registered> = {
	// Blocks with no component behind them, built by the website from an
	// entry's top-level attributes. The Masthead and the ContributorProfile
	// will join these.
	[ROOT]: { Renderer: Root, regions: [ "back_link", "sidebar", "main" ] },
	[BACK_LINK]: { Renderer: Back_Link },
	[TABLE_OF_CONTENTS]: { Renderer: Table_Of_Contents },

	// The catalogue.
	"container.section-v1": { Renderer: Section },
	"text.heading-v1": { Renderer: Heading },
	"text.plain-string-v1": { Renderer: Plain_String },
}
