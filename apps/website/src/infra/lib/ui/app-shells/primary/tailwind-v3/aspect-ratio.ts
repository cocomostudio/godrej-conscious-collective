
/**
 |
 | Aspect ratios (Phase 1).
 |
 | Pre-defines the small-integer ratios used bare in markup (`aspect-4/3`,
 | `aspect-3/4`, `aspect-2/1`). Large / odd ratios stay arbitrary in markup
 | (`aspect-[2304/4096]`, `aspect-[2/1.76]`, …) and need nothing here.
 | Tailwind's defaults (`auto`, `square`, `video`) are kept via `extend`.
 |
 */

export const aspect_ratio = {
	"4/3": "4 / 3",
	"3/4": "3 / 4",
	"2/1": "2 / 1",
	"portrait": "9 / 16",
	"wide": "16 / 9",
}
