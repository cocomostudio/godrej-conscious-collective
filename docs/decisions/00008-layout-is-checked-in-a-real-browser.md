# Layout is checked in a real browser, by measurement

The website's tests read the HTML the server sends back, and that HTML has no layout in it. A spacing, a height or a hover movement the design specifies can therefore break without any test failing. So the website adds **Playwright** as a second test layer, for what only a browser can show: where things sit, and how they move.

A browser test measures the design's own numbers — the 32px between two entries, the height of an entry, the distance an image moves on hover — and never the class names that produce them. That keeps the test failing when the intended layout breaks, and only then.

The page is served the same way the existing tests serve it: the real website, with the CMS stubbed behind a fake server of its own. A browser test therefore needs no running Strapi and no production build.

## Considered options

- **Screenshot comparison.** Rejected. A screenshot differs from one machine to the next on fonts and anti-aliasing, so a baseline fails for reasons nobody intended. And a design still being settled would force the baselines to be regenerated over and over.
- **Class-name assertions in the existing tests.** Rejected. A class-name test breaks on a harmless refactor, and still passes when two correct classes combine into a wrong layout.

## Consequences

The window widths a test uses come from the site's breakpoints, never from literal pixel values. When a breakpoint moves, the tests move with it.

The browser tests run on their own script, with one worker, so the existing test run stays as fast as it is.
