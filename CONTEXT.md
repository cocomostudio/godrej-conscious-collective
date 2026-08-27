# Godrej Conscious Collective

An event listing website and the Strapi CMS behind that website. The site features one event at a time, together with the sessions that make up that event.

## Language

### The event domain

**Event**:
A festival edition, such as "Conscious Collective 2025". An event owns a date range, a schedule document and a **palette** — the six colours a page can be drawn in. Not a "colour scheme", which is the separate thing a Page chooses.
_Avoid_: "festival", "edition"

**Main event**:
The single event currently marked as live. Exactly one event carries that mark at any time. The main event supplies the site chrome, meaning the header, the footer, and the When and Where at the foot of a two-column page's sidebar.
_Avoid_: "current event", "active event", "featured event"

**Resolved event**:
The event that a given page draws its colours, its listings and its schedule document from. Resolution takes the entry's own event first, then the main event, then a hardcoded fallback palette.
_Avoid_: "page event", "effective event", "context event"

**Session**:
One programme item within an event, such as a single workshop or a single talk. A session is what the public sees labelled as an "Event" on the site.
_Avoid_: "entry", "programme item", "post"

**Instance**:
One sitting of a session, carrying a start time and an end time. A session that runs on three days has three instances.
_Avoid_: "occurrence", "sitting", "session date", "showing"

**Category**:
The kind of a session, drawn from a fixed set: Showcase, Experience, Conversation and Workshop.
_Avoid_: "session type", "track"

**Contributor**:
A person who takes part in a session. The public label for a contributor is "Collaborator", and only the public label uses that second word.
_Avoid_: "collaborator" in code, "speaker", "participant", "fellow"

**Lead**:
A record created when a member of the public submits the **registration form**. The record is always a Lead — "the Leads list", never "the registrations list" — while "registration" names the act and the form a visitor meets. The two words are not interchangeable, and the second never names the row.
_Avoid_: "registration", "signup", "RSVP", "submission" **as the name of the record**

### The page domain

**Page Shell**:
The chrome that wraps a rendered page: site title, navigation, the registration form's slideshow and any injected code. A page shell carries no page content of its own.
_Avoid_: "page context", "layout", "template", "theme"

**Default page shell**:
The single page shell marked as the one new entries adopt. Exactly one page shell carries that mark at any time. An entry with no page shell of its own takes the default page shell.
_Avoid_: "fallback shell", "base shell", "main shell"

**Page layout**:
The column arrangement of a rendered page. An editor chooses between `one-column` and `two-column`. A third arrangement, the contributor layout, exists in the rendered result but is never chosen, because it follows from the content type rather than from an editor's choice.

The stored values spell the numbers out because Strapi refuses an enumeration value that begins with a digit.
_Avoid_: "layout" unqualified, "page type"

**Context colour**:
The colour a page is drawn in, as an alias every block points at rather than as a colour of its own. A block says `bg-context` once and is right wherever it is placed, because whatever owns the page — or the card, or the dialog — aims the alias at what that thing actually is. A Session aims it at its category's colour, a Contributor at the contributor one, and a Page at its **colour scheme**.
_Avoid_: "page colour", "current colour", "accent"

**Colour scheme**:
What a Page's editor points its **context colour** at: any of the resolved event's six palette colours, or plain black or plain white. It is the default the page starts from and never a repaint — a listing below still aims the alias at each card's own category, so a strip of mixed categories draws in several colours whatever the page is set to. Black and white are not palette colours and carry no per-event value. The editor meets it as `color_scheme`.
_Avoid_: "theme" for this meaning, "page colour", "palette" — that is the event's

**Sidebar**:
The narrow first column of a two-column page layout. The sidebar holds the back link, and the sidebar receives content from both the content type and from components. It also holds one piece of chrome — the **When and Where** — which is the one thing in it that follows the main event rather than the page.
_Avoid_: "side region", "aside", "left column"

### The render tree

**Block**:
A node in the render tree. A block is the frontend's unit of composition, and the renderer walks blocks.
_Avoid_: "node", "element", "widget", "section" as a generic word

**Component**:
A Strapi component schema. A component is the CMS's unit of composition, and an editor picks a component from a dynamic zone.
_Avoid_: "block" for this meaning, "content type" for this meaning

**Region**:
An attribute of a component or of an entry that holds blocks. A component with a single region names that region `content`.
_Avoid_: "dynamic zone" when describing the rendered result, "slot", "container"

**Section list**:
The set of components an editor may place directly inside a section. The section list holds every leaf component and every composite component.
_Avoid_: "the outer list", "the full list", "the main zone"

**Inner list**:
The set of components an editor may place inside a composite component. The inner list is deliberately small, and every composite component points its region at it.
_Avoid_: "the nested list", "the child list"

**Composite component**:
A component that carries a region of its own, drawn from the inner list. A composite component arranges its region against something else it owns, such as an image or a map.
_Avoid_: "container", "wrapper", "layout component"

**Leaf component**:
A component that carries no region. A leaf component is the bottom of the render tree.
_Avoid_: "atom", "primitive", "simple component"

**Envelope**:
What the CMS returns for one page: the entry, its page shell, the main event and the resolved event, in a single response. A page is one request and one cache entry.
_Avoid_: "payload", "page response", "page data"

**Rich text**:
The content of a Strapi `blocks` field. Rich text is never called "blocks", because "block" already names a node in the render tree.
_Avoid_: "blocks", "rich content", "WYSIWYG content"

### Listings

**Listing**:
A component that shows a group of things rather than a single one. Every listing over sessions or contributors stores no rows of its own: it stores either the identities an editor chose or a description of what to fetch, and the CMS turns whichever it is into rows before answering. **The Archive's two listings are the exception** — nothing in the CMS holds a past edition, so those two hold what they show, and the word covers them because what makes something a listing is that it draws a group.
_Avoid_: "collection", "feed", "carousel" as a name for the data

**Curated**:
A listing whose entries an editor picked and dragged into order.
_Avoid_: "manual", "hand-picked", "static"

**Automatic**:
A listing filled from the resolved event, by category and count, because nobody curated it. Curated and automatic listings are indistinguishable by the time they reach a block, which is the point of both words existing only in the CMS.
_Avoid_: "auto-populated" in code, "dynamic", "generated"

**Row**:
One entry a listing pulled, narrowed to the handful of fields the thing that draws it needs, and carrying its own URL. A row is never an entry: asking it for a region is asking for something no listing fetches.
_Avoid_: "item", "result", "record", "entry" for this meaning

**Card**:
How a session row is drawn — a picture, a day badge, a name, and a line saying who it is by, who it is for and what it costs.
_Avoid_: "tile", "session block", "preview"

**Treatment**:
What a card does while a pointer is over it, as one of two named answers an editor picks from — the stroke, which leaves the card's details box white and takes the words beneath the title up to the category's colour, and the fill, which floods that box with the colour instead and drops those words to black. The stroke is the default and is therefore what a listing nobody has answered for draws as. The picture grows a little under either, and that part is not a treatment because nobody chooses it. The editor meets the choice as `style_and_transition`, which is the attribute's name and not a second word for this.
_Avoid_: "hover style", "variant", "mode"

**Portrait**:
How a contributor row is drawn — a round picture with a name and a role beneath it.
_Avoid_: "avatar", "headshot", "collaborator card"

### The Archive

**Archive entry**:
One past edition of the festival, as an editor writes it: a name, a year, a description, three featured pictures and a region of snapshots. It is not an **Event** — no past edition has a row in the CMS, and an entry is content an editor types rather than a record anything resolves to.
_Avoid_: "archive slide" — a slide is what one *item inside* an entry becomes; "past event", "archived event"

**Snapshot**:
One block inside an archive entry's region. On a large, tall screen each snapshot is a slide of its own, side by side; anywhere else the same blocks are one column a visitor scrolls.
_Avoid_: "section", "panel", "card"

**Archive entry list**:
The set of components an editor may place inside an archive entry — the third named list, after the **section list** and the **inner list**. Every member of it can stand alone as a slide, which is why a bare link and a lone heading are in the inner list and not this one.
_Avoid_: "snapshot list", "the archive zone"

**Dark surface**:
A ground the catalogue's blocks are being drawn over that is dark rather than white. The snapshot dialog is the only one. It travels as context rather than as a prop, because a block can sit at any depth and the dialog does not know what an editor put in it. It **forces** rather than defaults: every word inside it is white and its **context colour** is pointed at white, whatever any component within it asks for, so nothing an editor picks can make a snapshot unreadable.
_Avoid_: "dark mode" — the site has no theme switch and never draws a page this way

### Filtration

**Filtration**:
Narrowing a listing down in the browser, over the rows the CMS already sent. Only the two listings that filter are uncapped, because a page that filters a set has to hold the set.
_Avoid_: "filtering" as a name for the feature, "search", "faceted search"

**Facet**:
One question the filtration widget asks — the dates, the age groups, the admissions, the categories. A facet with nothing selected asks nothing; options within a facet widen the answer and facets narrow it.
_Avoid_: "filter" for this meaning, "filter group", "criterion"

**Committed filters**:
What the listing is actually showing. Distinct from the **draft**, which is what a visitor has ticked but not yet applied — the draft never leaves the form, and below the medium breakpoint the Apply button is what turns one into the other.
_Avoid_: "active filters", "applied filters", "selection"

**Admission**:
Whether a place has to be paid for: free, or ticketed. Derived from the price rather than stored, and a session with no price at all is neither.
_Avoid_: "price filter", "event type" — the static site labels this facet "Event Types", which collides with the category facet

**Schedule entry**:
One sitting of one session on the schedule page — one per **instance**, so a session running on three days is three entries. It is why the schedule's count is larger than the number of sessions it holds.
_Avoid_: "session" for this meaning, "row", "slot"

**Channel**:
A named destination content can be rendered into from elsewhere on the page, through the slot-and-fill tunnel. Two exist: the **sidebar**, which a listing's filtration widget fills, and the **screen**, which the filtration drawer fills. A fill with no slot mounted falls back to rendering where it stands, which is what a one-column page relies on.
_Avoid_: "portal target", "slot" for the name itself, "outlet"

### Registration

**Registration form**:
The overlay a visitor fills in to produce a **Lead**. It is not a route: Register Now opens it through the slot-and-fill tunnel's **screen** channel, so a visitor registers from wherever they already were.
_Avoid_: "signup form", "RSVP form", "the modal"

**Relay**:
The website server's POST resource route, which parses a submission and forwards it to the CMS under an API token scoped to creating a Lead. The token never reaches a browser. The relay is also what stamps the **consent wording**, because it is the last party that knows what was rendered.
_Avoid_: "proxy", "endpoint", "the API route"

**Consent wording**:
The exact sentences that were on screen beside the box a registrant ticked, stored on the Lead. It changes over time, and a record that cannot say which version it agreed to is not a record.
_Avoid_: "consent text" in prose, "the terms", "the privacy copy"

**Retention date**:
When a Lead is due for deletion — the **main event**'s end date plus twelve months, computed once at submission so a later edit to that end date cannot move a window already promised in writing. **Nothing acts on it.** No deletion job is built; it is a record of a promise, not an enforcement of one.
_Avoid_: "expiry", "TTL", "purge date"

**Form token**:
A signed value minted when the overlay opens, carrying an issue time, a nonce, a hash of the address and the **honeypot**'s field name. It proves the form was served here, supplies the timing check, and is single-use. It is **not** a CSRF token — the endpoint is unauthenticated, so there is no ambient credential to forge with.
_Avoid_: "CSRF token", "nonce" for the whole thing, "session token"

**Honeypot**:
A field with a plausible name, rotated daily from a secret, that a person never sees and a scripted form-filler fills. A filled one is answered as though it had succeeded and nothing is recorded.
_Avoid_: "trap field", "spam field", "bot check"

## How block and component relate

Every component maps to exactly one block. Some blocks map to no component at all, because those blocks are built from an entry's top-level attributes instead. The Masthead on a session page is such a block, and the Masthead draws on the session's `name`, `standfirst` and `cover`.
