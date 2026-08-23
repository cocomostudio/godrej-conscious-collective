# Godrej Conscious Collective

An event listing website and the Strapi CMS behind that website. The site features one event at a time, together with the sessions that make up that event.

## Language

### The event domain

**Event**:
A festival edition, such as "Conscious Collective 2025". An event owns a date range, a schedule document and a colour scheme.
_Avoid_: "festival", "edition"

**Main event**:
The single event currently marked as live. Exactly one event carries that mark at any time. The main event supplies the site chrome, meaning the header and the footer.
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
A record created when a member of the public submits the registration form.
_Avoid_: "registration", "signup", "RSVP", "submission"

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

**Sidebar**:
The narrow first column of a two-column page layout. The sidebar holds the back link, and the sidebar receives content from both the content type and from components.
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

## How block and component relate

Every component maps to exactly one block. Some blocks map to no component at all, because those blocks are built from an entry's top-level attributes instead. The Masthead on a session page is such a block, and the Masthead draws on the session's `name`, `standfirst` and `cover`.
