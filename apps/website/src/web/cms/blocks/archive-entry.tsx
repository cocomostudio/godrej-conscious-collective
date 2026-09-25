
/**
 |
 | One past edition, as an entry on the Archive's timeline.
 |
 | A node on the spine, the year, a fan of three photographs, the edition's name
 | and a description, and — where an editor wrote any — a button that opens its
 | snapshots.
 |
 | **It is not a block.** An entry is a member of a repeatable component, so it
 | carries no `__component` and never reaches the registry: the timeline listing
 | receives entries as raw data and draws them with this. What sits *inside* an
 | entry is a region, and that goes back through the renderer — see
 | `archive-snapshots.tsx`.
 |
 | # The two ways in
 |
 | Pressing anywhere on the entry opens the snapshots, and so does the button.
 | That is one behaviour with two entrances rather than two behaviours: the entry
 | is a pointer-only convenience laid over the button, which is the real
 | control and the only one a keyboard sees. `use_click_without_drag` is what
 | keeps the convenience from firing on a drag, on a text selection, or on a
 | press that landed on the button itself. **The `<li>` is deliberately not
 | given a role or a tabindex** — see the note on that hook.
 |
 | # The spine
 |
 | The connector between two entries runs **horizontally below the large
 | breakpoint** and vertically from it, because the timeline itself turns from a
 | strip a visitor scrolls sideways into a stack of entries. Its two gradients
 | arrive as custom properties from the listing above, which is the only place
 | that can know which end of the spine fades out.
 |
 | # The fan
 |
 | Three photographs, absolutely stacked and each rotated. Pointing at the entry
 | from the large breakpoint upward spreads them. The schema asks for exactly
 | three, and each of the three is placed by hand rather than by a rule, because
 | what makes it a fan rather than a pile is that no two of them agree.
 |
 */

import { useState } from "react"

import {
	H,
	Level,
} from "#infra/lib/ui/react/headings.tsx"
import { Chevron_Right } from "#infra/lib/ui/react/icons/chevron-right.tsx"
import { Fill } from "#infra/lib/ui/react/slot-and-fill.tsx"
import { use_click_without_drag } from "#infra/lib/ui/react/use-click-without-drag.ts"

import type { Block } from "../envelope.ts"
import type { Image_Attribute } from "../media.ts"

import { SCREEN } from "../channels.ts"
import { use_media_origin } from "../media-origin.tsx"
import { picture_of } from "../media.ts"
import { Picture_Image } from "../pictures.tsx"

import { Archive_Snapshots } from "./archive-snapshots.tsx"

export type Archive_Entry_Attribute = {
	name: string
	year: string
	description?: string | null
	featured_images?: Image_Attribute[]
	content?: Block[]
}

/**
 |
 | Where each photograph sits in the fan, at rest and while pointed at.
 |
 | Positional, in the order an editor gave them: the first is in front, and the
 | two behind it lean opposite ways. Written out per position because the
 | arrangement is the design rather than a progression a loop could generate.
 |
 */
const FAN = [
	{
		figure:
			"w-full translate-y-[24%] lg:translate-y-0 lg:group-hover:translate-y-8",
		image: "mx-auto w-41 lg:w-auto lg:h-55 aspect-3/4 rounded-lg",
		layer: "z-30",
	},
	{
		figure:
			"w-full -translate-y-[5%] rotate-[15deg] translate-x-[6%] lg:translate-x-0 lg:translate-y-0 lg:rotate-[30deg] lg:group-hover:translate-x-[15%] lg:group-hover:translate-y-[15%] lg:group-hover:rotate-[15deg]",
		image: "mx-auto max-lg:self-start w-55 aspect-4/3 rounded-lg",
		layer: "z-20",
	},
	{
		figure:
			"w-full -translate-y-[40%] -rotate-[7.5deg] -translate-x-[8%] lg:translate-x-0 lg:translate-y-0 lg:-rotate-[30deg] lg:group-hover:-translate-x-[15%] lg:group-hover:-translate-y-[15%] lg:group-hover:-rotate-[7.5deg]",
		image: "mx-auto max-lg:self-start w-55 aspect-4/3 rounded-lg",
		layer: "z-10",
	},
]

/**
 |
 | The first entry's line, transparent at its top and solid from the top of the
 | node down. The stop is measured from the top of the line — see the numbers
 | on `Spine`, which this has to agree with. The listing sets it as a custom
 | property, because only the list knows which entry is first.
 |
 */
export const FADE_DOWN = [
	"to bottom",
	"rgba( var( --ctx-context-color ), 0 )",
	"rgb( var( --ctx-context-color ) ) 158px",
].join( ", " )

export function Archive_Entry ( { entry }: { entry: Archive_Entry_Attribute } ) {
	const origin = use_media_origin()
	const [ open, set_open ] = useState( false )

	// The tunnelled node the dialog portals into. Held in state rather than in
	// a ref so that capturing it re-renders — the dialog cannot be built until
	// there is a container to build it in.
	const [ container, set_container ] = useState<HTMLDivElement | null>( null )

	const snapshots = entry.content ?? []
	const has_snapshots = snapshots.length > 0

	const open_snapshots = () => {
		if ( has_snapshots ) {
			set_open( true )
		}
	}

	const row_handlers = use_click_without_drag<HTMLLIElement>(
		open_snapshots,
	)

	const pictures = ( entry.featured_images ?? [] )
		.map( ( image ) => picture_of( image, origin ) )
		.filter( ( picture ) => picture !== null )

	const title = `${entry.name} | ${entry.year}`

	return <li
		className={ `relative group flex flex-col lg:flex-row gap-4 pr-4 lg:pr-0 rounded-lg focus-within:outline focus-within:outline-1 focus-within:outline-offset-8 focus-within:outline-context ${
			has_snapshots ? "cursor-pointer" : ""
		}` }
		{ ...row_handlers }>
		<Spine />

		{
			/* From the large breakpoint the year, the node and the fan are
		     pinned to the top of the entry rather than centred in it, so that a
		     long description grows the entry downwards without moving them.
		     The year is centred on the fan, on the same line as the node. */
		}
		<H className="ml-4 w-[5ex] shrink-0 text-h4 text-black lg:m-0 lg:order-first lg:h-71 lg:flex lg:items-center lg:justify-end">
			{ entry.year }
		</H>

		{ pictures.length > 0
			&& <ul className="lg:m-0 max-lg:size-81.5 lg:w-95 lg:h-71 shrink-0 relative">
				{ pictures.map( ( picture, index ) => {
					const place = FAN[index] ?? FAN[FAN.length - 1]

					return <li
						className={ `absolute top-0 bottom-0 lg:top-8 lg:bottom-8 flex items-center w-full ${place.layer}` }
						key={ index }>
						<figure
							className={ `origin-center transition-transform duration-750 ${place.figure}` }>
							<Picture_Image
								className={ place.image }
								picture={ picture } />
						</figure>
					</li>
				} ) }
			</ul> }

		{
			/* **One level down from the year**, which is the entry's own
		     heading. The two are the same size in the design and different
		     things in the document: the year is what the timeline is indexed
		     by, and the name is what that edition was called. The level is
		     opened around the whole column so that anything else growing here
		     ranks below the year too. */
		}
		<Level>
			<div className="ml-4 lg:ml-0 lg:py-4">
				<H className="mt-4 lg:m-0 text-h4 text-black line-clamp-2">
					{ entry.name }
				</H>

				{ entry.description
					&& <p className="mt-4 text-p text-black">
						{ entry.description }
					</p> }

				{
					/* **No button where there is nothing to open.** An entry with
			     an empty region is the ordinary state of an edition nobody
			     has written up yet, and a control that opens an empty dialog
			     is worse than no control. */
				}
				{ has_snapshots
					&& <button
						aria-label={ `View more info about ${entry.name} held in ${entry.year}` }
						className="mt-4 lg:mt-8 flex gap-1 items-center text-button font-medium text-context cursor-pointer lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 transition-opacity"
						onClick={ () => set_open( true ) }
						type="button">
						See Snapshots
						<Chevron_Right />
					</button> }

				{
					/* Two steps, and both are needed. The fill tunnels a plain
			     `<div>` to the top of the page; its DOM node is captured into
			     state; and only then can the dialog be given that node as its
			     portal container, because a portal cannot target something
			     that has not been mounted yet.

			     **The tunnel is mounted whether or not the dialog is open**,
			     and only for an entry that has something to show. It has to
			     be: Base UI moves focus and starts trapping it when `open`
			     goes from false to true, so a dialog that arrives already
			     open never gives it that edge — see the note in
			     `archive-snapshots.tsx`. The cost is one empty `<div>` per
			     written-up edition; nothing is rendered inside it until
			     somebody presses. */
				}
				{ has_snapshots
					&& <Fill into={ SCREEN }>
						<div
							className="relative z-60"
							ref={ set_container }>
							{ container
								&& <Archive_Snapshots
									container={ container }
									content={ snapshots }
									on_open_change={ set_open }
									open={ open }
									title={ title } /> }
						</div>
					</Fill> }
			</div>
		</Level>
	</li>
}

/**
 |
 | The node on the spine, and the line running out of it.
 |
 | Entirely decoration, so it is hidden from assistive technology: the timeline
 | is an ordered list and the order is already in the markup.
 |
 | The line is horizontal below the large breakpoint and vertical from it. Two
 | of its four states belong to the ends — the first entry's line fades in out
 | of nothing, and the last entry's stops at its node rather than running on to
 | an entry that is not there — and both are asked for with `group-first` and
 | `group-last` rather than passed in, because an entry does not know where it
 | sits.
 |
 | **From the large breakpoint each entry owns the line above it.** The line
 | runs across the gap the list leaves above the entry, then down to the
 | entry's bottom edge, where the next entry's line takes over. The node sits
 | level with the middle of the fan. The first entry's fade turns solid at the
 | top of the node, and the last entry's line stops at the node's centre.
 |
 | The numbers behind those classes:
 |
 |   the gap above the entry      32px  (`lg:-top-8`)
 |   the node's top               126px into the entry  (`lg:mt-31.5`)
 |   the node's centre            142px, half of the fan's 284px
 |   the last entry's line        32 + 142 = 174px  (`lg:group-last:h-43.5`)
 |   the first entry's solid stop 32 + 126 = 158px down the line  (`FADE_DOWN`)
 |
 | The test ids are for the browser tests. The spine is hidden from assistive
 | technology, so it has no role or name to be found by.
 |
 */
function Spine () {
	return <div
		aria-hidden={ true }
		className="relative ml-4 lg:m-0 lg:flex lg:flex-col lg:items-center before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-0.5 before:bg-[linear-gradient(var(--archive-spine-fade-sideways))] before:hidden max-lg:group-first:before:block">
		<span
			className="relative block size-8 lg:mt-31.5 rounded-full border-2 border-context bg-white z-10"
			data-testid="spine-node">
		</span>

		<span
			className="absolute top-1/2 -translate-y-1/2 ml-8 w-full h-0.5 lg:-top-8 lg:bottom-0 lg:translate-y-0 lg:left-1/2 lg:-translate-x-1/2 lg:ml-0 lg:w-0.5 lg:h-auto max-lg:group-last:hidden lg:group-last:h-43.5 bg-context lg:group-first:bg-transparent lg:group-first:bg-[linear-gradient(var(--archive-spine-fade-down))]"
			data-testid="spine-line">
		</span>
	</div>
}
