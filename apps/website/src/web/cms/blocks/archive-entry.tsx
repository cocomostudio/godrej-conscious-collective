
/**
 |
 | One past edition, as a row on the Archive's timeline.
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
 | Pressing anywhere on the row opens the snapshots, and so does the button.
 | That is one behaviour with two entrances rather than two behaviours: the row
 | is a pointer-only convenience laid over the button, which is the real
 | control and the only one a keyboard sees. `use_click_without_drag` is what
 | keeps the convenience from firing on a drag, on a text selection, or on a
 | press that landed on the button itself. **The `<li>` is deliberately not
 | given a role or a tabindex** — see the note on that hook.
 |
 | # The spine
 |
 | The connector between two rows runs **horizontally below the medium
 | breakpoint** and vertically from it, because the timeline itself turns from a
 | strip a visitor scrolls sideways into a stack of rows. Its two gradients
 | arrive as custom properties from the listing above, which is the only place
 | that can know which end of the spine fades out.
 |
 | # The fan
 |
 | Three photographs, absolutely stacked and each rotated. Pointing at the row
 | from the medium breakpoint upward spreads them. The schema asks for exactly
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
			"w-full translate-y-[24%] md:translate-y-0 md:group-hover:translate-y-[25%]",
		image: "mx-auto w-41 aspect-3/4 rounded-lg",
		layer: "z-30",
	},
	{
		figure:
			"w-full -translate-y-[5%] rotate-[15deg] translate-x-[6%] md:translate-x-0 md:translate-y-0 md:rotate-[30deg] md:group-hover:translate-x-[15%] md:group-hover:translate-y-[15%] md:group-hover:rotate-[15deg]",
		image: "mx-auto max-md:self-start w-55 aspect-4/3 rounded-lg",
		layer: "z-20",
	},
	{
		figure:
			"w-full -translate-y-[40%] -rotate-[7.5deg] -translate-x-[8%] md:translate-x-0 md:translate-y-0 md:-rotate-[30deg] md:group-hover:-translate-x-[15%] md:group-hover:-translate-y-[15%] md:group-hover:-rotate-[7.5deg]",
		image: "mx-auto max-md:self-start w-55 aspect-4/3 rounded-lg",
		layer: "z-10",
	},
]

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
		className={ `relative group flex flex-col md:flex-row gap-4 pr-4 md:pr-0 rounded-lg focus-within:outline focus-within:outline-1 focus-within:outline-offset-8 focus-within:outline-context ${
			has_snapshots ? "cursor-pointer" : ""
		}` }
		{ ...row_handlers }>
		<Spine />

		<H className="ml-4 w-[5ex] shrink-0 text-h4 text-black md:m-0 md:order-first md:self-center md:text-right">
			{ entry.year }
		</H>

		{ pictures.length > 0
			&& <ul className="md:m-0 max-md:size-81.5 md:w-95 md:h-71.5 shrink-0 relative">
				{ pictures.map( ( picture, index ) => {
					const place = FAN[index] ?? FAN[FAN.length - 1]

					return <li
						className={ `absolute top-0 bottom-0 flex items-center w-full ${place.layer}` }
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
			/* **One level down from the year**, which is the row's own
		     heading. The two are the same size in the design and different
		     things in the document: the year is what the timeline is indexed
		     by, and the name is what that edition was called. The level is
		     opened around the whole column so that anything else growing here
		     ranks below the year too. */
		}
		<Level>
			<div className="ml-4 md:ml-0 md:py-4">
				<H className="mt-4 md:m-0 text-h4 text-black line-clamp-2">
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
						className="mt-4 md:mt-8 flex gap-1 items-center text-button font-medium text-context cursor-pointer md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity"
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
 | The line is horizontal below the medium breakpoint and vertical from it. Two
 | of its four states belong to the ends — the first row's line fades in out of
 | nothing, and the last row's stops half way rather than running on to a row
 | that is not there — and both are asked for with `group-first` and
 | `group-last` rather than passed in, because a row does not know where it sits.
 |
 */
function Spine () {
	return <div
		aria-hidden={ true }
		className="relative ml-4 md:m-0 md:flex md:items-center before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-0.5 before:bg-[linear-gradient(var(--archive-spine-fade-sideways))] before:hidden max-md:group-first:before:block">
		<span className="relative block size-8 rounded-full border-2 border-context bg-white z-10">
		</span>

		<span className="absolute top-1/2 -translate-y-1/2 ml-8 w-full h-0.5 md:-top-4 md:-bottom-4 md:translate-y-0 md:left-1/2 md:-translate-x-1/2 md:ml-0 md:w-0.5 md:h-auto md:group-last:h-1/2 bg-context md:group-first:bg-transparent md:group-first:bg-[linear-gradient(var(--archive-spine-fade-down))]">
		</span>
	</div>
}
