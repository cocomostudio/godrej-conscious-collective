
/**
 |
 | Heading.
 |
 | The element is chosen by `react-accessible-headings` from how deeply this
 | heading is nested, not by the editor. The editor's `level` picks how large it
 | looks and nothing else — which is what the static site was doing by hand, in
 | a place where getting it wrong produced an inaccessible document rather than
 | an ugly one.
 |
 */

import { H } from "#infra/lib/ui/react/headings.tsx"

import type {
	Block,
	Link as Link_Attribute,
} from "../envelope.ts"

import { use_anchor } from "../anchors.tsx"
import { Nav_Link } from "../nav-link.tsx"
import { Button } from "#infra/lib/ui/react/buttons/button.tsx"

const SIZES: Record<string, string> = {
	h1: "text-h1",
	h2: "text-h3",
	h3: "text-h4",
	h4: "text-h5",
	h5: "text-h6",
	h6: "text-h6",
}

type Heading_Props = Pick<Block, "__component" | "id"> & {
	content: string
	level?: string
	link?: Link_Attribute | null
}

export function Heading (
	{ __component, content, id, level = "h2", link }: Heading_Props,
) {
	const anchor = use_anchor( { __component, id } )

	return <div
		className="flex flex-wrap items-baseline justify-between gap-4 scroll-mt-4"
		id={ anchor }>
		<H
			className={ `${
				SIZES[level] ?? SIZES.h2
			} md:font-semibold text-context` }>
			{ content }
		</H>

		{ link?.url && <Heading_Link link={ link } /> }
	</div>
}

function Heading_Link ( { link }: { link: Link_Attribute } ) {
	return <Button
		emphasis="outline"
		color="context"
		render={ <Nav_Link url={ link.url } /> }>
		{ link.label ?? link.url }
	</Button>
}
