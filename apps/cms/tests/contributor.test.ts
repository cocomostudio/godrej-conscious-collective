
/**
 |
 | A collaborator, over HTTP, against a seeded database.
 |
 | Two things worth asserting are the same seam as the session's tests: the
 | envelope carries every attribute the ContributorProfile is built from, and
 | none of them is silently dropped by a populate object that has drifted from
 | the schema.
 |
 | The rest asserts what the middleware does. It is observed here rather than
 | called: publishing a session, unpublishing one, and deleting one each move
 | the collaborator's derived `events` set — a subsequent read of the
 | contributor is what tells us whether the derivation is right. The tests
 | never touch `Contributor.events` directly, because that is exactly what an
 | editor can never do either.
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
	type Seeded_Cms,
	boot_seeded_cms,
} from "./support/boot-seeded-cms.ts"

const DEBASMITA_PATH = "/api/envelope?path=/collaborators/debasmita-ghosh"

let cms: Seeded_Cms

beforeAll( async () => {
	cms = await boot_seeded_cms()
} )

afterAll( async () => {
	await cms?.destroy()
} )

describe("a collaborator's envelope", () => {
	it("carries every attribute the page is built from", async () => {
		const { body, status } = await cms.get( DEBASMITA_PATH )

		expect( status ).toBe( 200 )

		const { entry } = body.data

		expect( entry.contentType ).toBe( "api::contributor.contributor" )
		expect( entry.name ).toBe( "Debasmita Ghosh" )
		expect( entry.role ).toBe( "Installation artist" )
		expect( entry.image?.url ).toMatch( /^https?:\/\// )

		// Rich text arrives as an array of blocks.
		expect( Array.isArray( entry.blurb ) ).toBe( true )
		expect( entry.blurb[0].children[0].text ).toContain( "Debasmita" )
	})

	/**
	 |
	 | Decision record 00002: draft-and-publish is off, so the collaborator is
	 | live the moment an editor creates it. Every contributor written by the
	 | seed is therefore reachable on the published path without a publish
	 | step.
	 |
	 */
	it("is live at its URL immediately, without being published", async () => {
		const { status } = await cms.get( DEBASMITA_PATH )

		expect( status ).toBe( 200 )
	})

	it("does not expose the derived events relation to the envelope", async () => {
		const { body } = await cms.get( DEBASMITA_PATH )

		// The events set is the collaborators listing's join key, not
		// something the profile page reads, so the populate fragment leaves
		// it alone. A visitor asking for this envelope must not receive the
		// full event payload for every edition the collaborator is in.
		expect( body.data.entry.events ).toBeUndefined()
	})
})

describe("a collaborator's derived events", () => {
	it("include every event whose published sessions link to them", async () => {
		const events = await events_of( "Debasmita Ghosh" )

		expect( events.map( ( event ) => event.name ) ).toEqual( [
			"Conscious Collective 2027",
		] )
	})

	it("point at the collaborator's own event, not the main one", async () => {
		const events = await events_of( "Kaveri Nair" )

		expect( events.map( ( event ) => event.name ) ).toEqual( [
			"Conscious Collective 2029",
		] )
	})

	it("stay empty for a collaborator whose sessions are all drafts", async () => {
		// The seed attaches Iris Han to one session and leaves that session
		// unpublished. A collaborator whose work is all in draft belongs to
		// no edition and appears in no listing — the archival rule the
		// ticket asks for, without a stored flag.
		const events = await events_of( "Iris Han" )

		expect( events ).toEqual( [] )
	})
})

describe("the middleware", () => {
	it("adds the collaborator to the event when a session is published", async () => {
		const previously_empty = "Iris Han"
		const draft = await find_draft_session_with( previously_empty )

		expect( await events_of( previously_empty ) ).toEqual( [] )

		await cms.strapi.documents( "api::session.session" ).publish( {
			documentId: draft.documentId,
		} )

		try {
			expect( ( await events_of( previously_empty ) )
				.map( ( event ) => event.name ) )
				.toEqual( [ "Conscious Collective 2027" ] )
		} finally {
			await cms.strapi.documents( "api::session.session" ).unpublish( {
				documentId: draft.documentId,
			} )
		}
	})

	it("takes the collaborator out when the session is unpublished", async () => {
		const collaborator = "Priya Iyer"
		const session = await find_published_session_with( collaborator )

		expect( ( await events_of( collaborator ) ).length ).toBeGreaterThan(
			0,
		)

		await cms.strapi.documents( "api::session.session" ).unpublish( {
			documentId: session.documentId,
		} )

		try {
			expect( await events_of( collaborator ) ).toEqual( [] )
		} finally {
			await cms.strapi.documents( "api::session.session" ).publish( {
				documentId: session.documentId,
			} )
		}
	})

	it("takes the collaborator out when the session is deleted", async () => {
		const collaborator = "Rahul Verma"
		const session = await find_published_session_with( collaborator )

		expect( ( await events_of( collaborator ) ).length ).toBeGreaterThan(
			0,
		)

		await cms.strapi.documents( "api::session.session" ).delete( {
			documentId: session.documentId,
		} )

		expect( await events_of( collaborator ) ).toEqual( [] )
	})

	/**
	 |
	 | Removal without special handling — recomputing from scratch is what
	 | makes it work. The session is updated to drop a collaborator, and the
	 | derivation notices because the union of "before" and "after" contains
	 | that collaborator and their derived events are rebuilt from what is
	 | left.
	 |
	 */
	it("takes the collaborator out when the session drops them", async () => {
		const collaborator = "Arthur Mamou-Mani"
		const session = await find_published_session_with( collaborator )

		expect( ( await events_of( collaborator ) ).length ).toBeGreaterThan(
			0,
		)

		// The write leaves Debasmita on the session and takes Arthur off.
		const remaining_ids = session.contributors
			.filter( ( c: any ) => c.name !== collaborator )
			.map( ( c: any ) => c.documentId )

		await cms.strapi.documents( "api::session.session" ).update( {
			data: { contributors: { set: remaining_ids } },
			documentId: session.documentId,
			status: "published",
		} )

		expect( await events_of( collaborator ) ).toEqual( [] )
	})
})

async function events_of ( name: string ) {
	const contributor = await cms.strapi
		.documents( "api::contributor.contributor" )
		.findFirst( {
			filters: { name },
			populate: { events: true },
		} )

	return ( contributor?.events ?? [] ) as { name: string }[]
}

async function find_draft_session_with ( contributor_name: string ) {
	const contributor = await find_contributor( contributor_name )

	return await cms.strapi.documents( "api::session.session" ).findFirst( {
		filters: { contributors: { documentId: contributor.documentId } },
		status: "draft",
	} )
}

async function find_published_session_with ( contributor_name: string ) {
	const contributor = await find_contributor( contributor_name )

	return await cms.strapi.documents( "api::session.session" ).findFirst( {
		filters: { contributors: { documentId: contributor.documentId } },
		populate: { contributors: true },
		status: "published",
	} )
}

async function find_contributor ( name: string ) {
	return await cms.strapi
		.documents( "api::contributor.contributor" )
		.findFirst( { filters: { name } } )
}
