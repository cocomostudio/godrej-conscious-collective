# strapi-plugin-export-entries

Adds an **Export** button to the list page of chosen collection types in the Strapi 5 admin panel. The button opens a modal where an admin picks which entries and which fields to export. The entries download as a CSV file that opens cleanly in Excel and Google Sheets.

The plugin knows nothing about the project it is installed in. Three settings decide where the button shows and how dates are read.

## Installing the plugin

1. Add the package to the Strapi app's **runtime** dependencies. Strapi discovers plugins only through runtime dependencies.
2. Build the package before the app builds or starts: `pnpm --filter strapi-plugin-export-entries run build`.
3. Switch the plugin on in `config/plugins.ts`:

   ```ts
   export default () => ( {
   	"export-entries": { enabled: true },
   } )
   ```

4. Set `EXPORT_ENTRIES_CONTENT_TYPES` to the content-types that should get the button.

## The three settings

Each setting is read from an env var. A value set in `config/plugins.ts`, under `"export-entries".config`, overrides the env var.

| Env var | `config` key | What it holds | When unset |
| --- | --- | --- | --- |
| `EXPORT_ENTRIES_CONTENT_TYPES` | `content_types` | Content-type IDs, comma-separated, such as `api::lead.lead` | No list page gets the button |
| `EXPORT_ENTRIES_TIMEZONE` | `timezone` | An IANA timezone name, such as `Asia/Kolkata` | `UTC` |
| `EXPORT_ENTRIES_PRESETS` | `presets` | The "Latest N" sizes, comma-separated | `50,100,250` |

A set value replaces a default outright; it is never merged with it. So `EXPORT_ENTRIES_PRESETS=10,20` offers exactly 10 and 20. An `EXPORT_ENTRIES_PRESETS` that is present but empty offers no "Latest N" sizes at all.

In `config/plugins.ts`, a list can be written either as a comma-separated string or as an array:

```ts
"export-entries": {
	enabled: true,
	config: {
		content_types: [ "api::lead.lead" ],
		presets: [ 25, 50 ],
	},
},
```

## Who sees the button

The button shows only when both of these hold:

- The list page belongs to a content-type named in the content-types setting.
- The admin holds the content manager's **read** permission on that content-type.

The plugin adds no permission of its own. Super Admin holds every read permission, so Super Admin sees the button on every set-up content-type.

## What a role limits

An export never shows more than the admin's role can read. A role can limit an export in two ways:

- **Fields.** A field the role cannot read is left out of the modal and out of the file. A request that names such a field is refused.
- **Entries.** A role limited to some entries, such as "only entries I created", exports only those entries. The row count in the modal counts only those entries too.

An admin can hold several roles, and one role can grant a field only on some entries. For example, one role grants every field on every entry, while another role grants the "Price" field only on the admin's own entries. The file then holds every entry, but the "Price" cell stays empty on the entries other admins created.

A relation writes a related entry's display field only when the admin can read that field on that related entry. Otherwise, the relation writes the related entry's document ID, as the edit view does. For example, a role that reads only its own entries of the related content-type sees the display names of those entries, and document IDs for the rest.

Super Admin has neither limit, so Super Admin exports every field and every entry.

## Settings that refuse the boot

The plugin checks its settings when Strapi boots. A bad setting stops the boot with an error that names the bad value. The boot is refused for each of these:

- a content-type that does not exist
- a single type
- a localised content-type
- a content-type holding a component or dynamic-zone field
- a timezone that is not an IANA timezone name
- a preset that is not a positive whole number

## Which fields are listed

The modal lists the fields in the order the edit view shows them, under the edit view's labels. A field removed from the edit view through "Configure the view" is still listed, after the others, in schema order.

The modal leaves out:

- internal IDs and the document ID
- private fields
- password fields
- polymorphic relations, because their entries have no single display field

Components and dynamic zones are not supported. A content-type holding either one refuses the boot, as listed above.

## Choosing which entries

The modal offers a choice between "Preset" and "Custom date range".

"Preset" offers two groups of presets:

- **Latest N**: the N most recently created entries, one choice for each size in the presets setting.
- **A calendar period**: Today, Yesterday, This week, Last week, This month, Last month, This year or Last year.

Each calendar period shows the days it covers, as of the moment the modal opens: "Today (24/09)", "This week (21/09 to 24/09)", "Last month (August 2026)", "Last year (2025)".

A calendar period follows these rules:

- Its days are read in the timezone setting.
- A week runs from Monday to Sunday.
- "This week", "This month" and "This year" run up to today.
- The days are the ones the modal showed. A modal left open past midnight still exports the days its labels name.
- The days are fixed when the admin clicks Export, so an export that runs past midnight still covers the days the admin asked for.

"Custom date range" offers a start date and an end date. It follows these rules:

- Both days are included. An end date of 30 September includes the entries created on 30 September.
- Both days are read in the timezone setting, which the modal names.
- The end date cannot fall before the start date. The modal blocks such a range, and the server refuses it.

When no entry matches, the modal says "No entries match" and nothing downloads.

## The CSV file

The file is named after the content-type's plural name and the selection:

- Latest N: `<plural>_latest-<N>_<today>.csv`, such as `leads_latest-100_2026-09-25.csv`
- A calendar period or a custom date range: `<plural>_<start>_to_<end>.csv`, such as `leads_2026-09-01_to_2026-09-25.csv`

### Rows and columns

- Rows come newest first, by creation time.
- The columns are the ticked fields, in edit-view order, under their edit-view labels. "Created at" and "Updated at" follow them.

### Encoding

- The file is UTF-8 and starts with a byte-order mark, so that Excel shows non-English letters correctly.
- Lines end with CRLF.
- Every cell is wrapped in double quotes. A double quote inside a cell is doubled.

### Values

| Field type | Written as |
| --- | --- |
| Boolean | `TRUE` or `FALSE` |
| Date and time | `YYYY-MM-DD HH:mm`, in the timezone setting |
| Date | `YYYY-MM-DD` |
| JSON and rich text (blocks) | the stored JSON |
| Relation | the related entry's display field |
| Media | the file's URL |
| Anything empty | an empty cell |

### Relations and media

A relation cell holds the related entry's **display field**. The display field is the field that the content manager shows for the relation. It is set per relation, under "Configure the view" on the edit view. By default, the display field is the related content-type's first text field.

The export reads only the display field. It never follows the related entry's own relations.

A media cell holds the file's URL. A file kept on the Strapi server has a URL that starts with `/uploads/`. Such a URL is prefixed with the server's public URL, which is the `url` in `config/server.ts`, so that the link opens from the spreadsheet.

A relation to many entries, or a media field holding many files, writes all of its values in one cell, joined with `; `. An empty relation or media field gives an empty cell.

A related entry that has Draft & Publish is written once, as its draft, which is what the edit view shows.

### The formula guard

A spreadsheet runs a cell as a formula when the cell starts with certain characters. A registrant could plant such a cell in a form, and it would run on the machine of the admin who opens the file. The guard stops this.

A cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading `'`. The spreadsheet then shows the cell as text. Relation and media cells are guarded in the same way.

Two kinds of cell are left alone:

- a cell made only of digits, spaces, `+`, `-`, `(` and `)`, such as the phone number `+91 98765 43210`, because it cannot call a function
- a number from a number field, such as `-5` or `-1.5`, so that it stays a number

## How the file reaches the disk

The server reads the entries in batches of 500 and sends each batch only once the connection has taken the one before. The relations and media of a batch are read along with that batch. The browser saves the file straight to disk through a plain download link. So a large export raises the memory use of neither the server nor the browser.

Each download writes one line to the Strapi log. The line names the admin, the content-type, the selection, the fields and the row count.

A download that fails midway shows as "Failed" in the browser. The server cuts the connection before the file's end, so the browser never saves half a file as a whole one.

### One export at a time

Each admin may run one export at a time. While an admin's export is running, a second Export click shows "An export is already running". The admin can export again once the first download ends, whether that download finishes, fails or is cancelled in the browser.

## Why the download link carries a ticket

The browser saves the file through a plain download link, because only a plain link streams straight to disk. However, a plain link cannot carry the admin's login header. So the admin panel first asks the server for a ticket, and the link carries that ticket in its place.

A ticket is 32 random bytes, and it stands in for the admin's login. Four rules keep a leaked link useless:

- A ticket belongs to the admin who asked for it.
- A ticket works once. A second use is refused.
- A ticket must be used within 60 seconds of being issued. The limit covers only the wait before the download starts, so a slow download still runs to its end.
- When the ticket is used, the server checks the admin again, against the admin's current role. A deleted admin, a blocked admin, or an admin who has lost read permission gets nothing. The same goes for an admin who can no longer read a chosen field. A role that now limits the entries narrows the file to those entries.

The server keeps tickets in its own memory. So the plugin supports a single Strapi process. Several processes behind one load balancer would need a shared ticket store.
