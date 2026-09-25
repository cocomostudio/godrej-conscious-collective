
/**
 |
 | Made-up content-types for the fixture app. None of them resemble a real
 | CMS's content-types, so that a passing plugin is not tied to any one CMS.
 |
 */

/** A plain collection type holding one attribute of every scalar type. */
export const GADGET = {
	attributes: {
		title: { type: "string" },
		serial: { type: "uid", targetField: "title" },
		summary: { type: "text" },
		notes: { type: "richtext" },
		story: { type: "blocks" },
		contact: { type: "email" },
		stock: { type: "integer" },
		barcode: { type: "biginteger" },
		weight: { type: "float" },
		price: { type: "decimal" },
		released_on: { type: "date" },
		opens_at: { type: "time" },
		checked_at: { type: "datetime" },
		stamped_at: { type: "timestamp" },
		in_stock: { type: "boolean" },
		colour: { type: "enumeration", enum: [ "red", "green" ] },
		specs: { type: "json" },
		secret_code: { type: "string", private: true },
		passcode: { type: "password" },
	},
	collectionName: "gadgets",
	info: {
		displayName: "Gadget",
		pluralName: "gadgets",
		singularName: "gadget",
	},
	options: { draftAndPublish: false },
}

/** A collection type with Draft & Publish. */
export const ARTICLE = {
	attributes: {
		headline: { type: "string" },
	},
	collectionName: "articles",
	info: {
		displayName: "Article",
		pluralName: "articles",
		singularName: "article",
	},
	options: { draftAndPublish: true },
}

export const SETTING_SINGLE_TYPE = {
	attributes: {
		motto: { type: "string" },
	},
	collectionName: "settings",
	info: {
		displayName: "Setting",
		pluralName: "settings",
		singularName: "setting",
	},
	kind: "singleType",
	options: { draftAndPublish: false },
}

export const LOCALISED_PHRASE = {
	attributes: {
		wording: {
			type: "string",
			pluginOptions: { i18n: { localized: true } },
		},
	},
	collectionName: "phrases",
	info: {
		displayName: "Phrase",
		pluralName: "phrases",
		singularName: "phrase",
	},
	options: { draftAndPublish: false },
	pluginOptions: { i18n: { localized: true } },
}

export const BIT_COMPONENT = {
	attributes: {
		caption: { type: "string" },
	},
	collectionName: "components_parts_bits",
	info: { displayName: "Bit" },
}

export const KIT_WITH_COMPONENT = {
	attributes: {
		label: { type: "string" },
		bit: { type: "component", component: "parts.bit", repeatable: false },
	},
	collectionName: "kits",
	info: {
		displayName: "Kit",
		pluralName: "kits",
		singularName: "kit",
	},
	options: { draftAndPublish: false },
}

export const BOARD_WITH_DYNAMIC_ZONE = {
	attributes: {
		label: { type: "string" },
		blocks: { type: "dynamiczone", components: [ "parts.bit" ] },
	},
	collectionName: "boards",
	info: {
		displayName: "Board",
		pluralName: "boards",
		singularName: "board",
	},
	options: { draftAndPublish: false },
}

/** A collection type that no test sets the plugin up for. */
export const WIDGET = {
	attributes: {
		label: { type: "string" },
	},
	collectionName: "widgets",
	info: {
		displayName: "Widget",
		pluralName: "widgets",
		singularName: "widget",
	},
	options: { draftAndPublish: false },
}
