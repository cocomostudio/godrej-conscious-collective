
/**
 |
 | The admin panel's own entry point.
 |
 | It exists for one thing: the label on an enumeration option.
 |
 | Strapi builds an enum's options straight from the attribute's `enum` array,
 | with no room for a label beside each value — but the option it renders falls
 | back to `formatMessage( { id: value, defaultMessage: value } )`, so a
 | translation keyed by the stored value is what names it on screen. That is the
 | supported hook, and it is the only one.
 |
 | **The key is the bare stored value, so a label here reaches every enumeration
 | that spells an option the same way.** Both entries below are worth that: an
 | option meaning "no answer" should read as one wherever it turns up, and there
 | is one word for the Collaborator in this catalogue.
 |
 | Everything the admin metadata machinery does — labels, descriptions, form
 | layouts — is declared in the schema files instead and written into the
 | content manager's configuration at boot. See
 | `src/this/admin-metadata/configure-admin-metadata.ts`.
 |
 */

export default {
	config: {
		translations: {
			en: {
				auto: "Automatic",
				contributor: "Collaborator",
			},
		},
	},
}
