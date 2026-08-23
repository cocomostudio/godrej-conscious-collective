
import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { configure_admin_metadata } from "../src/this/admin-metadata/configure-admin-metadata"
import { boot_fixture_cms } from "./support/boot-fixture-cms"
import { bit_component_schema, thing_schema } from "./support/schemas"

const CONTENT_TYPE_KEY = "configuration_content_types::api::thing.thing"
const COMPONENT_KEY = "configuration_components::parts.bit"

describe("a schema's metadata declaration reaches the admin's configuration", () => {
	let cms: Awaited<ReturnType<typeof boot_fixture_cms>>
	let store: any

	beforeAll( async () => {
		cms = await boot_fixture_cms( {
			components: {
				"parts.bit": bit_component_schema( {
					note: "Ignored, and allowed so that a schema can explain itself.",
					metadatas: {
						caption: {
							edit: { label: "Caption" },
							list: { label: "Caption" },
						},
					},
					layouts: {
						edit: [ [ { name: "caption", size: 12 } ] ],
					},
				} ),
			},
			content_types: {
				thing: thing_schema( {
					metadatas: {
						name: {
							edit: {
								description: "What this thing is called",
								label: "Name",
							},
							list: { label: "Name" },
						},
						summary: {
							edit: { label: "Summary" },
							list: { label: "Summary" },
						},
					},
					layouts: {
						edit: [ [ { name: "name", size: 6 }, {
							name: "summary",
							size: 6,
						} ] ],
						list: [ "name" ],
					},
				} ),
			},
		} )

		store = cms.strapi.store( { type: "plugin", name: "content_manager" } )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	test("labels and descriptions declared in the file are stored", async () => {
		const stored = await store.get( { key: CONTENT_TYPE_KEY } )

		expect( stored.metadatas.name.edit ).toMatchObject( {
			description: "What this thing is called",
			label: "Name",
		} )
		expect( stored.metadatas.summary.list.label ).toBe( "Summary" )
	})

	test("layouts declared in the file are stored", async () => {
		const stored = await store.get( { key: CONTENT_TYPE_KEY } )

		expect( stored.layouts.edit ).toEqual( [
			[ { name: "name", size: 6 }, { name: "summary", size: 6 } ],
		] )
		expect( stored.layouts.list ).toEqual( [ "name" ] )
	})

	test("a component's metadata declaration is stored too", async () => {
		const stored = await store.get( { key: COMPONENT_KEY } )

		expect( stored.metadatas.caption.edit.label ).toBe( "Caption" )
		expect( stored.layouts.edit ).toEqual( [ [ {
			name: "caption",
			size: 12,
		} ] ] )
	})

	describe("when the database already holds a configuration", () => {
		beforeAll( async () => {
			const stored = await store.get( { key: CONTENT_TYPE_KEY } )

			// Stand in for an editor having changed things in the admin panel: a
			// label the file also declares, a label for an attribute the file says
			// nothing about, a layout of their own, and a setting.
			await store.set( {
				key: CONTENT_TYPE_KEY,
				value: {
					...stored,
					layouts: {
						...stored.layouts,
						edit: [
							[ { name: "summary", size: 12 } ],
							[ { name: "name", size: 12 } ],
						],
					},
					metadatas: {
						...stored.metadatas,
						createdAt: {
							edit: { label: "Made on" },
							list: { label: "Made on" },
						},
						name: {
							...stored.metadatas.name,
							edit: { label: "Clicked in" },
						},
					},
					settings: { ...stored.settings, pageSize: 50 },
				},
			} )

			// What the next boot does.
			await configure_admin_metadata( cms.strapi )
		} )

		test("the file wins for anything it declares", async () => {
			const stored = await store.get( { key: CONTENT_TYPE_KEY } )

			expect( stored.metadatas.name.edit.label ).toBe( "Name" )
		})

		test("anything the file does not mention survives", async () => {
			const stored = await store.get( { key: CONTENT_TYPE_KEY } )

			expect( stored.metadatas.createdAt.edit.label ).toBe( "Made on" )
			expect( stored.settings.pageSize ).toBe( 50 )
		})

		test("arrays are replaced wholesale rather than concatenated", async () => {
			const stored = await store.get( { key: CONTENT_TYPE_KEY } )

			expect( stored.layouts.edit ).toEqual( [
				[ { name: "name", size: 6 }, { name: "summary", size: 6 } ],
			] )
		})
	})

	describe("a key that names no attribute is refused", () => {
		const poison = ( uid: string, declaration: unknown ) => {
			const schema = uid.startsWith( "api::" )
				? cms.strapi.contentTypes[uid]
				: cms.strapi.components[uid]
			const original = schema.__
			schema.__ = declaration
			return () => {
				schema.__ = original
			}
		}

		const rejection = async ( uid: string, declaration: unknown ) => {
			const restore = poison( uid, declaration )
			try {
				await configure_admin_metadata( cms.strapi )
			} catch ( error ) {
				return ( error as Error ).message
			} finally {
				restore()
			}
			throw new Error(
				`Expected "${uid}" to be refused, and it was not.`,
			)
		}

		test("in a content type's metadatas", async () => {
			const message = await rejection( "api::thing.thing", {
				metadatas: { titel: { edit: { label: "Name" } } },
			} )

			expect( message ).toContain( "api::thing.thing" )
			expect( message ).toContain( "titel" )
		})

		test("in a list layout", async () => {
			const message = await rejection( "api::thing.thing", {
				layouts: { list: [ "name", "summry" ] },
			} )

			expect( message ).toContain( "api::thing.thing" )
			expect( message ).toContain( "summry" )
		})

		test("in an edit layout", async () => {
			const message = await rejection( "api::thing.thing", {
				layouts: { edit: [ [ { name: "nmae", size: 6 } ] ] },
			} )

			expect( message ).toContain( "api::thing.thing" )
			expect( message ).toContain( "nmae" )
		})

		test("in a component", async () => {
			const message = await rejection( "parts.bit", {
				metadatas: { captoin: { edit: { label: "Caption" } } },
			} )

			expect( message ).toContain( "parts.bit" )
			expect( message ).toContain( "captoin" )
		})

		test("and a misspelt declaration key is refused as well", async () => {
			const message = await rejection( "api::thing.thing", {
				metadata: { name: { edit: { label: "Name" } } },
			} )

			expect( message ).toContain( "api::thing.thing" )
			expect( message ).toContain( "metadata" )
		})
	})
})

describe("metadata naming an attribute that does not exist prevents boot", () => {
	test("the boot is refused, naming the schema and the key", async () => {
		let refusal: Error | undefined

		try {
			const cms = await boot_fixture_cms( {
				content_types: {
					thing: thing_schema( {
						metadatas: { titel: { edit: { label: "Name" } } },
					} ),
				},
			} )
			await cms.destroy()
		} catch ( error ) {
			refusal = error as Error
		}

		expect( refusal?.message ).toContain( "api::thing.thing" )
		expect( refusal?.message ).toContain( "titel" )
	})
})
