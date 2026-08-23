
/**
 |
 | HTML document hooks — the one component in the catalogue with **more than one
 | region**, and the reason the renderer has a way to declare region names at
 | all. Each of its three regions arrives here as a prop named after the
 | attribute, because the attribute-to-prop mapping is a property of the block
 | rather than of the schema.
 |
 | The three regions end up at three different points of the HTML document, and
 | a block renders in one place — so the document's layout mounts this once per
 | point and says which one it wants. `position` comes from the website rather
 | than from the CMS, exactly as the root block's colours and chrome do.
 |
 */

import type { ReactNode } from "react"

export const HOOK_POSITIONS = [
	"before_head_closing",
	"after_body_opening",
	"before_body_closing",
] as const

export type Hook_Position = typeof HOOK_POSITIONS[number]

export const HTML_DOCUMENT_HOOKS = "code.html-document-hooks-v1"

type Html_Document_Hooks_Props =
	& { position: Hook_Position }
	& Partial<Record<Hook_Position, ReactNode>>

export function Html_Document_Hooks (
	{ position, ...regions }: Html_Document_Hooks_Props,
) {
	return regions[position] ?? null
}
