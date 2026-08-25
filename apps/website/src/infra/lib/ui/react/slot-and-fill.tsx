
/**
 |
 | Slot and fill — the tunnel.
 |
 | A `Fill` renders its children wherever the matching `Slot` is, however far
 | apart in the tree the two sit and whichever order they mount in. Lifted from
 | the static site, where it is what the filtration widget and the registration
 | overlay both travel through.
 |
 | It exists because two pieces of this design need content to appear somewhere
 | its owner cannot reach. A listing component sits in the main column and its
 | filtration widget belongs in the sidebar, which is the main column's sibling
 | and is rendered before it. The registration overlay belongs at the top of the
 | screen, above everything, and is opened from a button anywhere on the page. A
 | React portal moves DOM but not React context; this moves the element itself,
 | so what arrives is still inside every provider it was written inside.
 |
 | # What it guarantees
 |
 |   • **Order is mount order.** Several fills into one channel appear in the
 |     order they mounted. What makes "the content type always precedes the
 |     component" true is simpler than that: the content type's blocks are the
 |     slot's own siblings, rendered above it, so a component's contribution can
 |     only arrive inside it.
 |
 |   • **A fill with no slot can fall back to rendering in place.** That is
 |     `when_absent="inline"`, and it is what a one-column page relies on: there
 |     is no sidebar to portal into, so the widget renders where it stands.
 |
 |   • **A snapshot that has not changed is the same object.** The store hands
 |     back the previous array when the new one is element-for-element identical,
 |     so `useSyncExternalStore` bails out rather than re-rendering every slot on
 |     every fill's re-render.
 |
 | # What it does on the server
 |
 | **Nothing tunnels during server rendering, and that is not a bug to fix
 | here.** A fill registers itself in a layout effect, which never runs on the
 | server, so a server-rendered slot is empty and a fill with
 | `when_absent="inline"` renders in place. The move happens on hydration. One
 | pass over a tree cannot render a slot that sits *before* the fill feeding it,
 | so any arrangement that put the tunnelled content in the right place server-
 | side would have to be a different mechanism, not a fix to this one.
 |
 */

import type { ReactNode } from "react"
import {
	createContext,
	Fragment,
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useRef,
	useSyncExternalStore,
} from "react"

/* _____
 | The store.
 |
 | One per provider, so two independently mounted trees do not share channels.
 |
 */

type Entry = {
	id: string
	element: ReactNode
}

const EMPTY: readonly Entry[] = Object.freeze( [] )

class Slot_Store {
	/** channel → id → entry. Insertion order is render order. */
	private channels = new Map<string, Map<string, Entry>>()

	private listeners = new Map<string, Set<() => void>>()
	private snapshots = new Map<string, readonly Entry[]>()
	/** The last snapshot handed out per channel, for reference stability. */
	private last_emitted = new Map<string, readonly Entry[]>()

	/** How many slots are mounted per channel — what drives the fallback. */
	private slot_counts = new Map<string, number>()
	private slot_listeners = new Map<string, Set<() => void>>()

	upsert ( channel: string, id: string, element: ReactNode ) {
		let bucket = this.channels.get( channel )

		if ( !bucket ) {
			bucket = new Map()
			this.channels.set( channel, bucket )
		}

		if ( bucket.get( id )?.element === element ) {
			return
		}

		bucket.set( id, { element, id } )
		this.snapshots.delete( channel )
		this.emit( channel )
	}

	remove ( channel: string, id: string ) {
		if ( !this.channels.get( channel )?.delete( id ) ) {
			return
		}

		this.snapshots.delete( channel )
		this.emit( channel )
	}

	get_snapshot ( channel: string ): readonly Entry[] {
		const cached = this.snapshots.get( channel )

		if ( cached ) {
			return cached
		}

		const bucket = this.channels.get( channel )

		if ( !bucket || bucket.size === 0 ) {
			this.snapshots.set( channel, EMPTY )
			return EMPTY
		}

		const frozen = Object.freeze(
			[ ...bucket.values() ],
		) as readonly Entry[]
		const previous = this.last_emitted.get( channel )

		// Reference stability: an identical snapshot is handed back as the same
		// object, so `useSyncExternalStore` bails out instead of re-rendering
		// the slot on every fill's re-render.
		if ( previous && same_entries( previous, frozen ) ) {
			this.snapshots.set( channel, previous )
			return previous
		}

		this.snapshots.set( channel, frozen )
		this.last_emitted.set( channel, frozen )

		return frozen
	}

	subscribe ( channel: string, listener: () => void ) {
		let set = this.listeners.get( channel )

		if ( !set ) {
			set = new Set()
			this.listeners.set( channel, set )
		}

		set.add( listener )

		return () => void set.delete( listener )
	}

	private emit ( channel: string ) {
		this.listeners.get( channel )?.forEach( ( listener ) => listener() )
	}

	register_slot ( channel: string ) {
		const before = this.slot_counts.get( channel ) ?? 0

		this.slot_counts.set( channel, before + 1 )

		if ( before === 0 ) {
			this.emit_slot( channel )
		}
	}

	unregister_slot ( channel: string ) {
		const before = this.slot_counts.get( channel ) ?? 0

		if ( before <= 1 ) {
			this.slot_counts.delete( channel )
			this.emit_slot( channel )
			return
		}

		this.slot_counts.set( channel, before - 1 )
	}

	has_slot ( channel: string ): boolean {
		return ( this.slot_counts.get( channel ) ?? 0 ) > 0
	}

	subscribe_slot ( channel: string, listener: () => void ) {
		let set = this.slot_listeners.get( channel )

		if ( !set ) {
			set = new Set()
			this.slot_listeners.set( channel, set )
		}

		set.add( listener )

		return () => void set.delete( listener )
	}

	private emit_slot ( channel: string ) {
		this.slot_listeners.get( channel )?.forEach( ( listener ) =>
			listener()
		)
	}
}

function same_entries ( one: readonly Entry[], other: readonly Entry[] ) {
	if ( one.length !== other.length ) {
		return false
	}

	return one.every( ( entry, at ) =>
		entry.id === other[at].id && entry.element === other[at].element
	)
}

/* _____
 | The provider.
 |
 */

const Store_Context = createContext<Slot_Store | null>( null )

export function Slot_Provider ( { children }: { children: ReactNode } ) {
	const store = useRef<Slot_Store | null>( null )

	if ( store.current === null ) {
		store.current = new Slot_Store()
	}

	return <Store_Context value={ store.current }>
		{ children }
	</Store_Context>
}

function use_slot_store (): Slot_Store {
	const store = useContext( Store_Context )

	if ( !store ) {
		throw new Error(
			"<Slot /> and <Fill /> can only be used inside a <Slot_Provider />.",
		)
	}

	return store
}

/* _____
 | Slot — where filled content arrives.
 |
 */

export function Slot ( { name }: { name: string } ) {
	const store = use_slot_store()

	// Announce this slot's presence, so a fill with `when_absent="inline"`
	// knows whether it has anywhere to go.
	useLayoutEffect( () => {
		store.register_slot( name )

		return () => store.unregister_slot( name )
	}, [ store, name ] )

	const subscribe = useCallback(
		( listener: () => void ) => store.subscribe( name, listener ),
		[ store, name ],
	)

	const get_snapshot = useCallback(
		() => store.get_snapshot( name ),
		[ store, name ],
	)

	const entries = useSyncExternalStore(
		subscribe,
		get_snapshot,
		get_snapshot,
	)

	return <>
		{ entries.map( ( entry ) =>
			<Fragment key={ entry.id }>{ entry.element }</Fragment>
		) }
	</>
}

/* _____
 | Fill — what travels.
 |
 */

export type When_Absent = "skip" | "inline"

export function Fill (
	{ children, into, when_absent = "skip" }: {
		into: string
		children: ReactNode
		/**
		 |
		 | What to do when the channel has no slot mounted. `"skip"` renders
		 | nothing; `"inline"` renders in place, which is what a page with no
		 | sidebar needs.
		 |
		 */
		when_absent?: When_Absent
	},
) {
	const store = use_slot_store()
	const id = useId()

	// Subscribed unconditionally: a conditional subscription would change the
	// hook order between renders.
	const subscribe = useCallback(
		( listener: () => void ) => store.subscribe_slot( into, listener ),
		[ store, into ],
	)

	const get_snapshot = useCallback(
		() => store.has_slot( into ),
		[ store, into ],
	)

	// The server snapshot is `false` because a layout effect never runs there,
	// so nothing has registered a slot yet. See the note at the head of this
	// file: the fallback is what renders server-side, and the move happens on
	// hydration.
	const slot_exists = useSyncExternalStore(
		subscribe,
		get_snapshot,
		() => false,
	)

	const renders_in_place = when_absent === "inline" && !slot_exists
	const tunnels = !renders_in_place

	// Two effects rather than one. The first only ever upserts, so a change of
	// content keeps this fill's position in the channel's insertion order; the
	// second only ever removes, so it does not run on a content change at all.
	useLayoutEffect( () => {
		if ( !tunnels ) {
			return
		}

		store.upsert( into, id, children )
	}, [ store, into, id, children, tunnels ] )

	useLayoutEffect( () => {
		if ( !tunnels ) {
			return
		}

		return () => store.remove( into, id )
	}, [ store, into, id, tunnels ] )

	return renders_in_place ? <>{ children }</> : null
}
