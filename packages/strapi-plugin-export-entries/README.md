# strapi-plugin-export-entries

Adds an **Export** button to the list page of chosen collection types in the Strapi 5 admin panel. The button opens a modal that lists the content-type's fields under the labels the edit view shows.

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
- relation and media fields
