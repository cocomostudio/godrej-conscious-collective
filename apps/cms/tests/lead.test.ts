
/**
 |
 | Lead, over HTTP, against a seeded database.
 |
 | The thing being asserted is a **negative**: that there is no way to read a
 | registrant's name, email address and phone number through the API, and that
 | there is no way to write one without the relay's token. A negative is only
 | worth asserting at the boundary a real caller uses, which is why every case
 | below goes over HTTP.
 |
 | One exception, and it is deliberate. Checking what the server *stored* means
 | reading the row back, and reading a row back is precisely what this content
 | type has no route for — so those assertions go through `strapi.documents`
 | directly. That is a side channel, and it is used only for the things a
 | caller cannot see and is not meant to: the event the server chose, the
 | retention date it computed, and the stamp it put on the consent.
 |
 */

import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
} from "vitest"

import strapi_app from "../src/index"
import {
	type Seeded_Cms,
	boot_seeded_cms,
} from "./support/boot-seeded-cms.ts"

const RELAY_TOKEN = process.env.REGISTRATION_RELAY_TOKEN
	?? "development-registration-relay-token"

const PERMISSION_UID = "plugin::users-permissions.permission"
const ROLE_UID = "plugin::users-permissions.role"

let cms: Seeded_Cms

beforeAll( async () => {
	cms = await boot_seeded_cms()
} )

afterAll( async () => {
	await cms?.destroy()
} )

/** A body the relay would send: the visitor's answers plus the wording. */
function a_submission ( overrides: Record<string, unknown> = {} ) {
	return {
		data: {
			consent_given: true,
			consent_text: "The wording that was on screen.",
			email_address: "ada@example.com",
			institution: "Analytical Engines",
			interests: "workshops",
			name_first: "Ada",
			name_last: "Lovelace",
			occupation: "practicing-architect",
			phone_number: "+91 98200 00000",
			...overrides,
		},
	}
}

async function post ( body: unknown, token?: string ) {
	const response = await fetch( `${cms.url}/api/leads`, {
		body: JSON.stringify( body ),
		headers: {
			"content-type": "application/json",
			...( token ? { authorization: `Bearer ${token}` } : {} ),
		},
		method: "POST",
	} )

	const text = await response.text()

	return { body: text ? JSON.parse( text ) : null, status: response.status }
}

describe("the Lead read path", () => {
	/*
	 | Not "403 without permission" — **404**, which is a different claim. The
	 | route does not exist, so no permission could enable it and no checkbox
	 | for one appears in the admin. A 403 would mean the door is shut; 404
	 | means there is no door.
	 */
	it("answers 404 for the collection, whatever any role holds", async () => {
		const { status } = await cms.get( "/api/leads" )

		expect( status ).toBe( 404 )
	})

	it("answers 404 for a single lead that really exists", async () => {
		const [ seeded ] = await cms.strapi
			.documents( "api::lead.lead" )
			.findMany( { limit: 1 } )

		expect( seeded ).toBeDefined()

		const { status } = await cms.get( `/api/leads/${seeded.documentId}` )

		expect( status ).toBe( 404 )
	})

	it("answers 404 even when carrying the relay's own token", async () => {
		const response = await fetch( `${cms.url}/api/leads`, {
			headers: { authorization: `Bearer ${RELAY_TOKEN}` },
		} )

		expect( response.status ).toBe( 404 )
	})
})

describe("creating a Lead", () => {
	it("refuses an anonymous caller", async () => {
		const { status } = await post( a_submission() )

		expect( status ).toBe( 403 )
	})

	it("refuses a caller carrying a token that is not a token", async () => {
		const { status } = await post( a_submission(), "not-the-relays-token" )

		expect( status ).toBe( 401 )
	})

	it("accepts the relay, and says nothing back but the id", async () => {
		const { body, status } = await post(
			a_submission( {
				email_address: "accepted@example.com",
			} ),
			RELAY_TOKEN,
		)

		expect( status ).toBe( 201 )
		expect( typeof body.data.documentId ).toBe( "string" )

		// The whole response, and deliberately: a create route that echoed the
		// record would be a read path wearing a POST.
		expect( Object.keys( body.data ) ).toEqual( [ "documentId" ] )
	})

	it("refuses a submission that did not consent", async () => {
		const { status } = await post(
			a_submission( { consent_given: false } ),
			RELAY_TOKEN,
		)

		expect( status ).toBe( 400 )
	})

	/*
	 | The whole reason the attribute exists: a record of personal data that
	 | cannot say what was agreed to is not a consent record. Refused rather
	 | than stored with the wording blank, and refused as a 400 rather than
	 | surfacing the schema's own rejection as a 500.
	 */
	it("refuses a submission carrying no consent wording", async () => {
		const without = a_submission()
		delete ( without.data as Record<string, unknown> ).consent_text

		expect( ( await post( without, RELAY_TOKEN ) ).status ).toBe( 400 )

		expect(
			( await post(
				a_submission( { consent_text: "   " } ),
				RELAY_TOKEN,
			) )
				.status,
		).toBe( 400 )
	})
})

describe("what the server sets on a Lead", () => {
	it("stamps the event, the retention date and the consent time", async () => {
		await post(
			a_submission( { email_address: "stamped@example.com" } ),
			RELAY_TOKEN,
		)

		const stored = await find_lead( "stamped@example.com" )

		expect( stored.event?.name ).toBe( "Conscious Collective 2027" )

		// The main event ends on 2027-12-13, and the promise is twelve months
		// from there. Written out rather than computed the way the code
		// computes it, so the assertion can disagree with the code.
		expect( stored.retain_until.slice( 0, 10 ) ).toBe( "2028-12-13" )

		expect( stored.consent_at ).toBeTruthy()
		expect( stored.consent_text ).toBe( "The wording that was on screen." )
	})

	it("ignores an event and a retention date the caller tried to set", async () => {
		const other = await cms.strapi.documents( "api::event.event" )
			.findFirst( { filters: { main: false } } )

		await post(
			a_submission( {
				email_address: "overreaching@example.com",
				event: other.documentId,
				retain_until: "2099-01-01T00:00:00.000Z",
			} ),
			RELAY_TOKEN,
		)

		const stored = await find_lead( "overreaching@example.com" )

		expect( stored.event?.name ).toBe( "Conscious Collective 2027" )
		expect( stored.retain_until.slice( 0, 4 ) ).toBe( "2028" )
	})

	it("drops an attribute the schema does not have", async () => {
		const { status } = await post(
			a_submission( {
				email_address: "extra@example.com",
				is_administrator: true,
			} ),
			RELAY_TOKEN,
		)

		expect( status ).toBe( 201 )

		const stored = await find_lead( "extra@example.com" )

		expect( "is_administrator" in stored ).toBe( false )
	})
})

describe("the boot-time repair", () => {
	/*
	 | The row this plants is one nothing in the application can create any
	 | more — there is no read route to grant. It is what a database carries
	 | after somebody ticked the box back when there was one, and the point is
	 | that Strapi's own pruning will not remove it: pruning goes by the
	 | controller's keys, and `find` is still a controller key.
	 |
	 | The seam is the application's own `bootstrap`, which is the function
	 | `strapi start` calls. Nothing reaches past it into the repair itself.
	 */
	it("deletes a stored Public-role Lead read permission, and says so", async () => {
		const role = await cms.strapi.db.query( ROLE_UID ).findOne( {
			select: [ "id" ],
			where: { type: "public" },
		} )

		await cms.strapi.db.query( PERMISSION_UID ).create( {
			data: { action: "api::lead.lead.find", role: role.id },
		} )

		const warnings: string[] = []
		const real_warn = cms.strapi.log.warn.bind( cms.strapi.log )
		cms.strapi.log.warn = ( message: string ) => {
			warnings.push( String( message ) )
			return real_warn( message )
		}

		try {
			await strapi_app.bootstrap( { strapi: cms.strapi } )
		} finally {
			cms.strapi.log.warn = real_warn
		}

		const remaining = await cms.strapi.db.query( PERMISSION_UID ).findMany(
			{
				where: { action: "api::lead.lead.find", role: role.id },
			},
		)

		expect( remaining ).toHaveLength( 0 )
		expect( warnings.join( "\n" ) ).toContain( "api::lead.lead.find" )
	})
})

describe("the custom admin roles", () => {
	it("gives content work a role that cannot reach Leads at all", async () => {
		const role = await cms.strapi.service( "admin::role" )
			.findOne( { code: "gcc-content" } )

		expect( role ).toBeTruthy()

		const permissions = await cms.strapi.db
			.query( "admin::permission" )
			.findMany( { where: { role: role.id } } )

		expect( permissions.length ).toBeGreaterThan( 0 )
		expect(
			permissions.some( ( permission ) =>
				permission.subject === "api::lead.lead"
			),
		).toBe( false )
	})

	it("gives anyone who needs the registrations a role for that alone", async () => {
		const role = await cms.strapi.service( "admin::role" )
			.findOne( { code: "gcc-leads" } )

		expect( role ).toBeTruthy()

		const permissions = await cms.strapi.db
			.query( "admin::permission" )
			.findMany( { where: { role: role.id } } )

		expect( permissions ).toHaveLength( 1 )
		expect( permissions[0].subject ).toBe( "api::lead.lead" )
		expect( permissions[0].action ).toBe(
			"plugin::content-manager.explorer.read",
		)
	})
})

describe("the sample content", () => {
	it("carries ten registrations, each with its consent recorded", async () => {
		const leads = await cms.strapi.documents( "api::lead.lead" ).findMany(
			{
				filters: { email_address: { $endsWith: "@example.com" } },
				populate: [ "event" ],
			},
		)

		const seeded = leads.filter( ( lead ) =>
			lead.consent_text?.includes(
				"Privacy Notice",
			)
		)

		expect( seeded ).toHaveLength( 10 )

		for ( const lead of seeded ) {
			expect( lead.consent_given ).toBe( true )
			expect( lead.consent_at ).toBeTruthy()
			expect( lead.retain_until.slice( 0, 10 ) ).toBe( "2028-12-13" )
			expect( lead.event?.name ).toBe( "Conscious Collective 2027" )
		}
	})
})

async function find_lead ( email_address: string ) {
	const [ lead ] = await cms.strapi.documents( "api::lead.lead" ).findMany( {
		filters: { email_address },
		populate: [ "event" ],
	} )

	expect( lead ).toBeDefined()

	return lead
}
