
/**
 |
 | Transition durations & delays (Phase 1).
 |
 | Pre-defines a 50ms-step scale up to 500ms, covering the bare values used in
 | markup (`duration-150/200/300/450/500`, `delay-150/450`). The odd `190`
 | value stays arbitrary (`duration-[190ms]`, handled in Phase 7).
 | Merged via `extend`, so Tailwind's own duration/delay defaults remain.
 |
 */

const time_step = 50
const time_max = 1000

function generate_time_scale () {
	const scale: Record<string, string> = {}
	for ( let ms = 0; ms <= time_max; ms += time_step ) {
		scale[String( ms )] = ms === 0 ? "0s" : `${ms}ms`
	}
	return scale
}

export const transition_duration = generate_time_scale()
export const transition_delay = generate_time_scale()
