# Site chrome follows the main event, not the page's own event

Status: accepted

The header and the footer read their date range, their Register Now button and their date/time line from the **main event**. Every other event-derived thing on a page reads from the **resolved event**, which is the entry's own event, falling back to the main event, falling back to a hardcoded palette. The header and the footer are site-wide furniture rather than page content, so the header and the footer should advertise whatever festival the site is currently running.

## Considered options

The alternative was to have the header and the footer follow the resolved event, so that a page about a 2025 session would show 2025 dates in the header. That alternative was rejected because a visitor arriving on an old page through an old link would then see no route to the festival that is actually running.

## Consequences

⚠️ **Known problem, deliberately accepted, unmitigated, and needing a fix later.** On an archived page the chrome and the body disagree. A visitor reading a Conscious Collective 2025 session sees a Register Now button for Conscious Collective 2027 directly above that 2025 content. The page therefore appears to offer registration for the session being read, which it does not.

One mitigation was considered and declined. An archived entry could have suppressed or relabelled the Register Now button, and the map owner chose not to do that. The problem therefore stands in full, and the header's date range would remain wrong even if the button were fixed.

Reversing this decision changes what the frontend fetches per request, because the chrome would then depend on the entry rather than on a single site-wide lookup.
