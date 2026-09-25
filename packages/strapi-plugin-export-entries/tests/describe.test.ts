
/**
 |
 | Describe, over HTTP: what the Export modal needs to know about one
 | content-type before the admin picks anything.
 |
 | The edit view's layout and labels are changed through the content manager's
 | own configuration endpoint, the way an admin changes them in the panel. So
 | the assertions on order and labels hold against whatever the edit view
 | shows, rather than against the order of the schema file.
 |
 */

import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
} from "vitest"

import {
	type Fixture_Strapi,
	boot_fixture_strapi,
	SUPER_ADMIN,
} from "./support/boot-fixture-strapi.ts"
import { ARTICLE, GADGET, WIDGET } from "./support/schemas.ts"

const READ = "plugin::content-manager.explorer.read"

describe("Describe", () => {
	let cms: Fixture_Strapi
	let super_token: string

	beforeAll( async () => {
		cms = await boot_fixture_strapi( {
			content_types: {
				article: ARTICLE,
				gadget: GADGET,
				widget: WIDGET,
			},
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES:
					"api::gadget.gadget, api::article.article",
				EXPORT_ENTRIES_PRESETS: undefined,
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
		} )
		super_token = await cms.login( SUPER_ADMIN.email )

		await configure_edit_view( cms, super_token, "api::gadget.gadget", {
			labels: {
				contact: "Email address",
				stock: "Units in stock",
				summary: "Short summary",
			},
			order: [ "stock", "title", "contact" ],
			removed: [ "summary", "barcode" ],
		} )
	} )

	afterAll( async () => {
		await cms?.destroy()
	} )

	it("refuses a caller who is not logged in", async () => {
		const { status } = await cms.request(
			"GET",
			"/export-entries/content-types/api::gadget.gadget",
		)

		expect( status ).toBe( 401 )
	})

	it("refuses an admin who cannot read the content-type", async () => {
		const role = await cms.create_role( "No reading", [] )
		const email = await cms.create_admin( "unread@example.com", role )

		const { status } = await cms.request(
			"GET",
			"/export-entries/content-types/api::gadget.gadget",
			{ token: await cms.login( email ) },
		)

		expect( status ).toBe( 403 )
	})

	it("answers 404 for a content-type the plugin is not set up for", async () => {
		const { status } = await cms.request(
			"GET",
			"/export-entries/content-types/api::widget.widget",
			{ token: super_token },
		)

		expect( status ).toBe( 404 )
	})

	it("answers an admin who holds read permission", async () => {
		const role = await cms.create_role( "Gadget readers", [
			{ action: READ, conditions: [], subject: "api::gadget.gadget" },
		] )
		const email = await cms.create_admin( "reader@example.com", role )

		const { status } = await cms.request(
			"GET",
			"/export-entries/content-types/api::gadget.gadget",
			{ token: await cms.login( email ) },
		)

		expect( status ).toBe( 200 )
	})

	it("lists the fields in edit-view order, under edit-view labels", async () => {
		// "summary" and "barcode" are removed from the edit view, so they come
		// last, in schema order, and still under their edit-view labels.
		const { body } = await cms.request(
			"GET",
			"/export-entries/content-types/api::gadget.gadget",
			{ token: super_token },
		)

		expect( body.data.fields ).toEqual( [
			{ label: "Units in stock", name: "stock" },
			{ label: "title", name: "title" },
			{ label: "Email address", name: "contact" },
			{ label: "serial", name: "serial" },
			{ label: "notes", name: "notes" },
			{ label: "story", name: "story" },
			{ label: "weight", name: "weight" },
			{ label: "price", name: "price" },
			{ label: "released_on", name: "released_on" },
			{ label: "opens_at", name: "opens_at" },
			{ label: "checked_at", name: "checked_at" },
			{ label: "stamped_at", name: "stamped_at" },
			{ label: "in_stock", name: "in_stock" },
			{ label: "colour", name: "colour" },
			{ label: "specs", name: "specs" },
			{ label: "Short summary", name: "summary" },
			{ label: "barcode", name: "barcode" },
		] )
	})

	it("leaves out IDs, private fields and passwords", async () => {
		const { body } = await cms.request(
			"GET",
			"/export-entries/content-types/api::gadget.gadget",
			{ token: super_token },
		)
		const names = body.data.fields.map( ( field ) => field.name )

		expect( names ).not.toContain( "id" )
		expect( names ).not.toContain( "documentId" )
		expect( names ).not.toContain( "secret_code" )
		expect( names ).not.toContain( "passcode" )
	})

	it("reports the timezone, the presets and Draft & Publish", async () => {
		const gadget = await cms.request(
			"GET",
			"/export-entries/content-types/api::gadget.gadget",
			{ token: super_token },
		)
		const article = await cms.request(
			"GET",
			"/export-entries/content-types/api::article.article",
			{ token: super_token },
		)

		expect( gadget.body.data ).toMatchObject( {
			draft_and_publish: false,
			presets: [ 50, 100, 250 ],
			timezone: "Asia/Kolkata",
		} )
		expect( article.body.data.draft_and_publish ).toBe( true )
	})
})

describe("Describe, when config/plugins.ts sets values", () => {
	it("prefers those values to the env vars", async () => {
		const cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: "api::gadget.gadget",
				EXPORT_ENTRIES_PRESETS: "50,100,250",
				EXPORT_ENTRIES_TIMEZONE: "Asia/Kolkata",
			},
			plugin_config: { presets: [ 5 ], timezone: "Europe/Paris" },
		} )

		try {
			const { body } = await cms.request(
				"GET",
				"/export-entries/content-types/api::gadget.gadget",
				{ token: await cms.login( SUPER_ADMIN.email ) },
			)

			expect( body.data ).toMatchObject( {
				presets: [ 5 ],
				timezone: "Europe/Paris",
			} )
		} finally {
			await cms.destroy()
		}
	})
})

describe("Describe, when the presets env var is set", () => {
	it.each( [
		[ "10,20", [ 10, 20 ] ],
		[ "", [] ],
	] )( "reads %j as the presets %j, with no default merged in", async (
		value,
		presets,
	) => {
		const cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: {
				EXPORT_ENTRIES_CONTENT_TYPES: "api::gadget.gadget",
				EXPORT_ENTRIES_PRESETS: value,
			},
		} )

		try {
			const { body } = await cms.request(
				"GET",
				"/export-entries/content-types/api::gadget.gadget",
				{ token: await cms.login( SUPER_ADMIN.email ) },
			)

			expect( body.data.presets ).toEqual( presets )
		} finally {
			await cms.destroy()
		}
	} )
})

describe("Describe, when no content-type is set up", () => {
	it("answers 404 for every content-type", async () => {
		const cms = await boot_fixture_strapi( {
			content_types: { gadget: GADGET },
			env: { EXPORT_ENTRIES_CONTENT_TYPES: undefined },
		} )

		try {
			const { status } = await cms.request(
				"GET",
				"/export-entries/content-types/api::gadget.gadget",
				{ token: await cms.login( SUPER_ADMIN.email ) },
			)

			expect( status ).toBe( 404 )
		} finally {
			await cms.destroy()
		}
	})
})

/**
 |
 | Renames fields, moves some to the top of the edit view and removes others
 | from it, through the same endpoint the panel's "Configure the view" page
 | uses. Fields named in neither list keep their places after the moved ones.
 |
 */
async function configure_edit_view (
	cms: Fixture_Strapi,
	token: string,
	uid: string,
	{ labels, order, removed }: {
		labels: Record<string, string>
		order: string[]
		removed: string[]
	},
) {
	const path = `/content-manager/content-types/${uid}/configuration`
	const { body } = await cms.request( "GET", path, { token } )
	const { layouts, metadatas, settings } = body.data.contentType

	// The GET adds each relation's `mainField` for the panel's convenience,
	// and the PUT refuses it back.
	for ( const metadata of Object.values<any>( metadatas ) ) {
		delete metadata.edit?.mainField
		delete metadata.list?.mainField
	}

	for ( const [ name, label ] of Object.entries( labels ) ) {
		metadatas[name].edit.label = label
	}

	const rest = layouts.edit.flat()
		.filter( ( field ) =>
			!order.includes( field.name ) && !removed.includes( field.name )
		)
	const moved = order.map( ( name ) => ( { name, size: 6 } ) )

	const { status, body: answer } = await cms.request( "PUT", path, {
		body: {
			layouts: {
				...layouts,
				edit: [ ...moved, ...rest ].map( ( field ) => [ field ] ),
			},
			metadatas,
			settings,
		},
		token,
	} )

	if ( status !== 200 ) {
		throw new Error(
			`Configuring the edit view of ${uid} answered ${status}: `
				+ JSON.stringify( answer ),
		)
	}
}
