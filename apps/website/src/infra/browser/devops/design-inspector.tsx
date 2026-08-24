
/**
 |
 | The design inspector — the column grid, drawn over the page, for catching
 | alignment mistakes by eye.
 |
 | Lifted from the static site. Press `G` to show it and `G` again to hide it.
 | The bars are the grid the layout plugin defines, so they move with it: three
 | columns below the medium breakpoint and twelve from it upward, separated by
 | the real gutter and sitting inside the real content container.
 |
 | **It never reaches production.** Its only mount is behind
 | `import.meta.env.DEV` in the primary app shell, which the production build
 | folds to `false` — so the dynamic import beside it is dropped and neither
 | this module nor a chunk for it is emitted at all.
 |
 | Two changes from the static site's copy. The overlay is held in state rather
 | than toggled by reaching into `classList`, so React remains the only thing
 | writing to this subtree. And the key is ignored while the visitor is typing,
 | because the registration form has text fields and `G` is a letter people
 | type — the static site's copy toggled the grid mid-word.
 |
 */

import {
	useEffect,
	useState,
} from "react"

const TOGGLE_KEY = "g"

/** The twelve slots the layout plugin's grid has from the medium breakpoint. */
const COLUMNS = Array.from( { length: 12 }, ( _unused, index ) => index + 1 )

/** Below the medium breakpoint the grid is three columns, not twelve. */
const COLUMNS_BELOW_MEDIUM = 3

export function Design_Inspector ( { enabled = false }: { enabled?: boolean } ) {
	const [ shown, set_shown ] = useState( enabled )

	useEffect( function listen_for_the_toggle () {
		function on_key_down ( event: KeyboardEvent ) {
			if ( event.key?.toLowerCase() !== TOGGLE_KEY ) {
				return
			}

			// A modified `G` belongs to the browser or to the operating
			// system, and typing belongs to whatever is being typed into.
			if ( event.altKey || event.ctrlKey || event.metaKey ) {
				return
			}

			if ( is_typing( event.target ) ) {
				return
			}

			set_shown( ( was_shown ) => !was_shown )
		}

		document.addEventListener( "keydown", on_key_down )

		return () => document.removeEventListener( "keydown", on_key_down )
	}, [] )

	if ( !shown ) {
		return null
	}

	return <Grid_Overlay />
}

/**
 |
 | Above everything, and clickable through: the overlay is there to be looked
 | past rather than at, so it takes the highest stacking order a browser will
 | accept and no pointer events at all.
 |
 */
function Grid_Overlay () {
	return <div
		className="fixed inset-0 opacity-15 pointer-events-none"
		id="js_grid_overlay"
		style={ { zIndex: 2147483647 } }>
		<div className="cc mx-auto h-full grid grid-rows-1 grid-cols-3 md:grid-cols-12 gap-x-[var(--gutter-x)] *:bg-red text-h1 font-sans text-white text-center">
			{ COLUMNS.map( ( column ) =>
				<div
					className={ `flex flex-col justify-between py-2 md:py-4 ${
						column > COLUMNS_BELOW_MEDIUM
							? "max-md:hidden"
							: ""
					}` }
					key={ column }>
					<span>{ column }</span>
					<span>{ column }</span>
				</div>
			) }
		</div>
	</div>
}

/**
 |
 | Whether the keystroke was meant for a field rather than for the page.
 |
 | `contentEditable` counts, because the WYSIWYG block's own editing surface in
 | the admin is one and a developer with both open should not have the grid
 | flicker under them.
 |
 */
function is_typing ( target: EventTarget | null ) {
	if ( !( target instanceof HTMLElement ) ) {
		return false
	}

	return target.isContentEditable
		|| [ "INPUT", "TEXTAREA", "SELECT" ].includes( target.tagName )
}

export default Design_Inspector
