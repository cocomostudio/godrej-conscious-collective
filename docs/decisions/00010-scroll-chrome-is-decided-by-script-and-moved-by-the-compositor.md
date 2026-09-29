# Scroll chrome is decided by script and moved by the compositor

The site header slides in on scroll-up and away on scroll-down, and the sticky bars below it move to make room. The Register Now bar fades in and out with scroll depth. A small script decides **when** each of them changes, in every browser. The browser's compositor thread does the **moving**, so the motion stays smooth while the page is busy. This replaces the CSS-only approach of ADR 00009, for three reasons:

- CSS alone ran in Chrome only.
- CSS could not ignore small scrolls, so a reader rocking back and forth around one spot made the bars pop in and out.
- The Register Now bar's CSS chain flickered in Chrome and never hid in Safari.

## Consequences

The script reads the reader's scrolling as movements. A movement is continuous scrolling in one direction, and it ends on a reversal or a 150ms pause. Only a movement of 64px or more changes anything. Jumps to in-page links, and scrolling while a menu or drawer locks the page, are ignored.

A change of state moves each bar in one step: the site header's sticky `top`, and `--site-header-offset` for the bars below it. The script then lays a `translate` animation over that step, from the distance each element moved back to zero (FLIP). Animating `top` itself would re-lay out the page on every frame.

The fade of the Register Now bar is a CSS transition of `opacity` and `translate`, both of which run on the compositor.

Before the page hydrates, or without JavaScript, neither bar changes state: the site header scrolls away with the page, and the Register Now bar stays in sight.
