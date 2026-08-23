
/**
 |
 | What every logo takes so that it can name itself.
 |
 | An `<svg />` is not a picture to a screen reader unless it says so. A `title`
 | is what gets read, and a `description` is the longer form for the rare logo
 | that needs one — both optional, because a decorative mark beside a name that
 | is already written out should stay silent rather than be read twice.
 |
 */

export type Accessible_Svg_Props = {
	title?: string
	description?: string
}
