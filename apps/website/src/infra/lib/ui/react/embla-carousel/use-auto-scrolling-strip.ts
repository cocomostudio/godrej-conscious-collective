
/**
 |
 | A strip that scrolls sideways on its own, forever.
 |
 | The marquee and the sponsors list are the same mechanism with different
 | contents: an Embla carousel that cannot be dragged, looping, driven by the
 | auto-scroll plugin. Two copies of this in this catalogue would be two places
 | for the loop's settings to drift apart.
 |
 | **A pointer resting on the strip does not stop it.** Two things do: the
 | strip leaving the screen, and the page becoming hidden. They are held as one
 | answer rather than as two switches, so that a tab coming back cannot restart
 | a strip that has scrolled away.
 |
 | It hands back the two refs the caller has to attach — the viewport it
 | measures and the track it counts children of — and the number of times the
 | caller should repeat its own slides so that the loop always has something to
 | wrap onto.
 |
 */

import { useCallback, useEffect, useRef, useState } from "react"
import AutoScroll from "embla-carousel-auto-scroll"
import useEmblaCarousel from "embla-carousel-react"
import { useOnInView } from "react-intersection-observer"

import { use_when_page_is_hidden } from "../use-when-page-is-hidden.ts"

import { use_repetitions_needed_for_looping } from "./use-repetitions-needed-for-looping.ts"

// Every one of these has to hold for the strip to move.
type Playing_Conditions = {
	page_is_visible: boolean
	strip_is_on_screen: boolean
}

export function use_auto_scrolling_strip ( slide_count: number ) {
	const [ viewport_node, set_viewport_node ] = useState<HTMLElement | null>(
		null,
	)
	const [ track_node, set_track_node ] = useState<HTMLElement | null>( null )

	const [ embla_ref, embla_api ] = useEmblaCarousel( {
		align: "start",
		containScroll: false,
		loop: true,
		watchDrag: false,
	}, [
		AutoScroll( {
			playOnInit: false,
			speed: 1,
			startDelay: 0,
			stopOnInteraction: false,
			stopOnMouseEnter: false,
		} ),
	] )

	const conditions = useRef<Playing_Conditions>( {
		page_is_visible: true,
		strip_is_on_screen: false,
	} )

	// The plugin has one switch and no memory of what turned it off, so the
	// whole set decides here. Playing an already-playing strip and stopping an
	// already-stopped one are both no-ops, which is what lets each condition
	// report its own change and leave the rest alone.
	const settle_motion = useCallback( () => {
		const auto_scroll = embla_api?.plugins().autoScroll

		if ( !auto_scroll ) {
			return
		}

		const { page_is_visible, strip_is_on_screen } = conditions.current

		strip_is_on_screen && page_is_visible
			? auto_scroll.play()
			: auto_scroll.stop()
	}, [ embla_api ] )

	const set_conditions = useCallback(
		( change: Partial<Playing_Conditions> ) => {
			Object.assign( conditions.current, change )
			settle_motion()
		},
		[ settle_motion ],
	)

	// Off screen it stops entirely: a strip nobody can see should not be
	// animating, and on a long page there may be two of them. Any sliver on
	// screen counts, so that it is already moving by the time there is enough
	// of it to read.
	const in_view_ref = useOnInView( ( in_view ) => {
		set_conditions( { strip_is_on_screen: in_view } )
	}, { threshold: 0 } )

	use_when_page_is_hidden( () => {
		set_conditions( { page_is_visible: false } )

		return () => set_conditions( { page_is_visible: true } )
	} )

	// Embla arrives a render late, so whatever the conditions had already
	// settled to is handed over as soon as it does.
	useEffect( () => {
		settle_motion()
	}, [ settle_motion ] )

	// One node, three consumers: Embla drives it, the intersection observer
	// watches it, and the repeat count measures against it.
	const viewport_ref = useCallback( ( node: HTMLElement | null ) => {
		set_viewport_node( node )
		embla_ref( node )
		in_view_ref( node )
	}, [ embla_ref, in_view_ref ] )

	const repeat_count = use_repetitions_needed_for_looping(
		track_node,
		viewport_node,
		slide_count,
	)

	return { repeat_count, track_ref: set_track_node, viewport_ref }
}
