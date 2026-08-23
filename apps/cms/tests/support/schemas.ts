
/**
 |
 | Schema fixtures. Small on purpose: the point of every test that uses one is
 | the `"__"` declaration, not the attributes underneath it.
 |
 */

export function thing_schema ( metadata_declaration?: unknown ) {
	return {
		attributes: {
			name: { type: "string" },
			summary: { type: "text" },
		},
		collectionName: "things",
		info: {
			displayName: "Thing",
			pluralName: "things",
			singularName: "thing",
		},
		options: { draftAndPublish: false },
		...( metadata_declaration === undefined
			? {}
			: { __: metadata_declaration } ),
	}
}

export function bit_component_schema ( metadata_declaration?: unknown ) {
	return {
		attributes: {
			caption: { type: "string" },
		},
		collectionName: "components_parts_bits",
		info: {
			displayName: "Bit",
		},
		...( metadata_declaration === undefined
			? {}
			: { __: metadata_declaration } ),
	}
}
