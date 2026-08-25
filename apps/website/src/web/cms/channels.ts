
/**
 |
 | The channels content travels between, named once.
 |
 | A channel is a string, and a string spelled twice is two channels — one of
 | them silently empty. Both ends of every tunnel in this build read their name
 | from here.
 |
 */

/**
 |
 | The sidebar of a two-column page, below the back link, the page's title and
 | everything the content type contributed.
 |
 | **The content type always precedes the component.** That order is not
 | enforced here; it follows from where the slot sits — the content type's
 | blocks are the slot's own siblings, rendered above it, and a component's
 | contribution can only arrive inside it.
 |
 | A one-column page renders no sidebar and therefore no slot, which is what
 | sends a fill with `when_absent="inline"` back to rendering in place.
 |
 */
export const SIDEBAR = "sidebar"

/**
 |
 | The top of the page, above the chrome and outside every sticky, scrolled and
 | stacked box on it.
 |
 | What goes here is what has to escape the layout entirely: the filtration
 | drawer, and the registration overlay after it.
 |
 */
export const SCREEN = "screen"
