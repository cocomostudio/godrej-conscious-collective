
/**
 |
 | Section — the only thing an editor may place directly in a main region,
 | because background, spacing and anchoring all live here.
 |
 | **Spacing is padding, never margin.** Sections carry backgrounds, and a
 | margin between two filled sections renders as a strip of nothing between two
 | blocks of colour.
 |
 | Its `title` is not shown. The title names the section in the table of
 | contents; the heading is what a reader sees.
 |
 */

import type { ReactNode } from "react"

import { Level } from "#infra/lib/ui/react/headings.tsx"

import type { Block } from "../envelope.ts"

import { use_anchor } from "../anchors.tsx"
import { Heading } from "./heading.tsx"

type Section_Props = Pick<Block, "__component" | "id"> & {
	title: string
	/**
	 |
	 | An ordinary component attribute rather than a region, so it is rendered
	 | directly rather than walked to. Nothing invents a `__component` for it:
	 | the schema already says what it is.
	 |
	 */
	heading?:
		| { id?: number; content: string; level?: string; link?: any }
		| null
	children: ReactNode
}

export function Section (
	{ __component, children, heading, id }: Section_Props,
) {
	const anchor = use_anchor( { __component, id } )

	return <section
		className="py-6 md:py-8 first:pt-0 last:pb-0 scroll-mt-4"
		id={ anchor }>
		{ heading && <Heading
			__component="text.heading-v1"
			id={ heading.id }
			content={ heading.content }
			level={ heading.level }
			link={ heading.link } /> }

		<Level>{ children }</Level>
	</section>
}
