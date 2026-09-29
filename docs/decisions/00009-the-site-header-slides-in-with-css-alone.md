# The site header slides in with CSS alone, in Chrome only

Superseded by [00010](./00010-scroll-chrome-is-decided-by-script-and-moved-by-the-compositor.md).

The site header slides back in when the reader scrolls up, and slides away when the reader scrolls down. Every sticky bar below it moves down to make room. This is built in CSS alone, on scroll-state container queries, and those queries only exist in **Chrome 144 and up**. Safari and Firefox get the page as it was before: the site header scrolls away, and the sticky bars stick at the top of the screen. We chose this over a JavaScript scroll listener that would run everywhere, because the aim was to use as little JavaScript as possible. Safari and Firefox pick up the full version on their own once they ship the queries.

## Consequences

The only JavaScript left is a measurement of the site header's height, published as `--site-header-height`, since CSS cannot read one element's height from another. That measurement runs on resize, never on scroll.

The Register Now bar below the medium breakpoint follows the same approach with scroll-driven animations, which Chrome and Safari 26 have. Firefox has neither, so there alone a small scroll listener writes the same flag the stylesheet would.

Two behaviours come from the platform rather than from a choice:

- The browser counts any scroll as a direction, however small. So the site header has no threshold below which it ignores a scroll.
- The browser does not remember that the site header was shown. So scrolling up reveals it anywhere on the page, including inside the first screen.

Adding JavaScript to Safari and Firefox is left open, to be decided after seeing how the first iteration behaves.
