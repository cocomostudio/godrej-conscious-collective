
/**
 |
 | A strip that scrolls sideways on its own, forever.
 |
 | The marquee and the sponsors list are the same mechanism with different
 | contents: an Embla carousel that cannot be dragged, looping, driven by the
 | auto-scroll plugin, playing only while it is on screen and stopping while a
 | pointer rests on it. The static site had one copy per section; two copies of
 | this in this catalogue would be two places for the loop's settings to drift
 | apart.
 |
 | It hands back the two refs the caller has to attach — the viewport it
 | measures and the track it counts children of — and the number of times the
 | caller should repeat its own slides so that the loop always has something to
 | wrap onto.
 |
 */

import { useCallback, useState } from "react"
import AutoScroll from "embla-carousel-auto-scroll"
import useEmblaCarousel from "embla-carousel-react"
import { useOnInView } from "react-intersection-observer"

import { use_repetitions_needed_for_looping } from "./use-repetitions-needed-for-looping.ts"

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
			stopOnInteraction: false,
			stopOnMouseEnter: true,
		} ),
	] )

	// Off screen it stops entirely: a strip nobody can see should not be
	// animating, and on a long page there may be two of them.
	const in_view_ref = useOnInView( ( in_view ) => {
		const auto_scroll = embla_api?.plugins().autoScroll

		if ( !auto_scroll ) {
			return
		}

		in_view ? auto_scroll.play() : auto_scroll.stop()
	}, { threshold: 0.5 } )

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
