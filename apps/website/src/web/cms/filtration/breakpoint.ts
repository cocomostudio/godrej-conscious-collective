
/**
 |
 | The medium breakpoint, as a media query.
 |
 | **This is one of the static site's defects, fixed during the lift.** Two
 | things in the filtration widget are gated on the viewport — whether a change
 | commits the moment it is made, and whether the drawer closes itself — and the
 | static site gates them at 768 pixels while the design's medium breakpoint is
 | 1024. Between those two widths its submit button is hidden by a `md:` class
 | and its auto-apply has not switched on, so a visitor ticks a box, presses
 | nothing, and nothing happens.
 |
 | One constant rather than two literals, because the two rules have to agree
 | with each other and with `screens.ts`, and three copies of a number is three
 | places for them to stop agreeing.
 |
 | It is written out rather than read from the Tailwind config: the config is a
 | build-time module the browser never sees, and importing it into a component
 | would pull the whole plugin tree into the client bundle to learn one number.
 | A test asserts this query and `screens.md` name the same width, which is what
 | keeps the two copies honest.
 |
 */

export const FROM_THE_MEDIUM_BREAKPOINT = "( min-width: 1024px )"
