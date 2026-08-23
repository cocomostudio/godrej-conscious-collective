
/**
 |
 | Z-index scale.
 |
 | Extends Tailwind's stock `z-0` … `z-50` (and `z-auto`) with 60 → 100 in
 | steps of 10, so deeply-stacked overlays don't need arbitrary values.
 | Merged via `extend`, so the defaults remain.
 |
 */

const z_step = 10
const z_min = 60
const z_max = 100

function generate_z_scale () {
	const scale: Record<string, string> = {}
	for ( let z = z_min; z <= z_max; z += z_step ) {
		scale[String( z )] = String( z )
	}
	return scale
}

export const z_index = generate_z_scale()
