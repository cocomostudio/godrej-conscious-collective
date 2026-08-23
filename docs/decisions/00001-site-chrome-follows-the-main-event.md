# Site chrome follows the main event, not the page's own event

The header and the footer read their date range, their Register Now button and their date/time line from the **main event**. Everything else event-derived on a page reads from the **resolved event** — the entry's own event, falling back to the main event, falling back to a hardcoded palette. Chrome is site-wide furniture rather than page content, so it advertises whatever festival is currently running; the alternative, chrome following the resolved event, would leave a visitor arriving on an old page through an old link with no route to the festival that is actually running.

## Consequences

⚠️ **Known problem, deliberately accepted and unmitigated.** On an archived page the chrome and the body disagree: a Conscious Collective 2025 session sits directly under a Register Now button for 2027, so the page appears to offer registration for the session being read. Suppressing or relabelling that button on archived entries was considered and declined, and the header's date range would still be wrong even if the button were fixed.
