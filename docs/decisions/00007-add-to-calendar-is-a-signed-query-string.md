# Add to Calendar is a signed query string, not a lookup

`GET /calendar.ics` builds its iCalendar entry **entirely from its query string**. It reads no entry, resolves no alias and asks the CMS nothing; the page that draws the button puts the session's name, hours, venue, standfirst and path into the address, and the endpoint formats them. Every link is HMAC-signed with `CALENDAR_LINK_SECRET`, and an address this server did not mint is a 404.

The alternative considered was a path-addressed route — `/calendar/sessions/x.ics` — that fetched the envelope and read the instance out of it. It was rejected on two counts. It costs a CMS round trip on every tap, in the one interaction that should be instant. And naming *which* instance is genuinely awkward: an array index is only meaningful against whatever order the CMS currently returns `instances` in, so an editor reordering or deleting an instance silently repoints every link at a different one. Keying by start time fixes that but keeps the round trip.

Signing was chosen over leaving the endpoint open. Unsigned, the address is a public machine for putting arbitrary words into somebody's calendar under this site's own domain. That is bounded — the body is `text/calendar` behind `nosniff` and an attachment disposition, so it is never a document on this origin, and RFC 5545 escaping keeps a crafted value from becoming a second `VEVENT` — but an invitation that appears to come from the festival is a real thing to be able to forge, and the domain is exactly what would lend it credibility. The signature covers a canonical serialisation of the whitelisted parameters, every one present even when empty, so that dropping one is a forgery rather than a shortcut, while a parameter the endpoint does not read cannot change what it answers.

The one parameter that becomes a link in the finished entry is a **path**, joined to this server's own origin, never a whole address. A URL taken verbatim would let a minted entry carry a link to anywhere.

## Consequences

The secret cannot reach the browser, so every href has to be minted while the page is being rendered. A session's own sidebar is easy — root assembly puts the instances on the block. The schedule page is not: its rows arrive spliced into a listing component by the CMS, inside a region the website otherwise never looks into, so `with_calendar_links` walks the assembled tree to reach them. That walk exists **only because of signing**, and would be deleted along with it.

`CALENDAR_LINK_SECRET` has no default, like the other two secrets. Unlike them, its absence is visible: no links can be minted, so the button is not drawn at all. That is deliberate — a control that 404s on press is worse than one that is not there — but it means a deployment that forgets the variable loses a feature rather than degrading quietly, and nothing in the logs of a working site will say so.

Rotating the secret invalidates every link in an already-rendered page. The cost is one refresh, because links are rebuilt on every render and nobody holds one for long.

An entry built from the address cannot go fresh the way a lookup would. The href is rebuilt from live content each time the page renders and the file is fetched immediately afterwards by somebody looking at that page, so the window is a page view wide — but a link kept and tapped a week later describes the session as it was, not as it is.

Values are capped at 300 characters and truncated rather than refused, so a long standfirst reaches a calendar clipped rather than not at all.
