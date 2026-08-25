
/**
 |
 | Populate fragment for `media.full-bleed-image-v1`.
 |
 | The same three crops the responsive image holds — this component differs from
 | that one in where it is drawn rather than in what it stores, so the fragment
 | is the same one and is reused rather than restated.
 |
 | `spacing_around` is a scalar and needs no branch of its own.
 |
 */

import { populate_responsive_image_v1 } from "./responsive-image-v1"

export const populate_full_bleed_image_v1 = populate_responsive_image_v1
