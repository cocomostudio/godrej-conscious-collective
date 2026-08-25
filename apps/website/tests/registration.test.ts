
/**
 |
 | The registration form's flow, end to end at the boundary.
 |
 | The real Express server over HTTP, with the CMS stubbed at `fetch` — the
 | same seam every other file here uses. Everything between the request and the
 | response is the thing under test: the rate limiter, the token, the honeypot,
 | the schema and the relay. Nothing is reached around, and no function is
 | called directly except `mint_form_token`, which is how a token that is
 | already half an hour old is produced without a test that waits half an hour.
 |
 | **Every case uses an address of its own**, presented in `X-Forwarded-For` the
 | way a reverse proxy does. Without it the whole file is one visitor and the
 | rate limiter — which is doing its job — refuses the sixth test.
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
	type Website,
	boot_website,
} from "./support/boot-website.ts"
import {
	envelope,
	event,
	page_shell,
} from "./support/envelopes.ts"

import { mint_form_token } from "../src/web/cms/registration/form-token.server.ts"

const TOKEN_PATH = "/registration/token"
const SUBMIT_PATH = "/registration"

const PAGE_PATH = "/about"

/**
 |
 | A token has to be at least three seconds old to be spent. Nothing in the
 | protection is being turned off for the tests, so the happy path genuinely
 | waits — once, at the top, for a token every case that needs a valid one
 | borrows the age of.
 |
 */
const YOUNGEST_MS = 3 * 1000

let website: Website

beforeAll( async () => {
	website = await boot_website( {
		[PAGE_PATH]: envelope(
			{ title: "About" },
			{
				main_event: event( { name: "Conscious Collective 2025" } ),
				page_shell: page_shell(),
			},
		),
	} )
} )

afterAll( async () => {
	await website?.stop()
} )

/** What a filled-in form sends, minus the token and the honeypot. */
function a_submission ( overrides: Record<string, unknown> = {} ) {
	return {
		accuracy_declaration: true,
		company_or_school: "Analytical Engines",
		email: "ada@example.com",
		first_name: "Ada",
		interests: [ "workshops", "conversations" ],
		last_name: "Lovelace",
		mobile: "+91 98200 00000",
		occupation: "practicing-architect",
		privacy_consent: true,
		...overrides,
	}
}

async function mint ( address: string ) {
	const { body, status } = await website.json( TOKEN_PATH, {
		address,
		method: "GET",
	} )

	expect( status ).toBe( 200 )

	return body as { token: string; honeypot: string }
}

async function submit (
	address: string,
	body: Record<string, unknown>,
) {
	return await website.json( SUBMIT_PATH, { address, body } )
}

/** A token minted `age_ms` ago, so the timing checks can be exercised. */
function aged_token ( address: string, age_ms: number ) {
	const minted = mint_form_token( address, Date.now() - age_ms )

	expect( minted ).not.toBeNull()

	return minted!
}

describe("the page a visitor arrives on", () => {
	/*
	 | The whole reason the mint is a resource route. Page responses are
	 | cached, so a token rendered into the HTML would be the same one for
	 | every visitor holding that cache entry, with an age measuring the entry
	 | rather than the visitor.
	 */
	it("carries no form token, and no honeypot name", async () => {
		const { html, status } = await website.get( PAGE_PATH )

		expect( status ).toBe( 200 )

		// The token's own version prefix. Anything minted would carry it.
		expect( html ).not.toContain( "v1." )

		for (
			const name of [ "referral_code", "invitation_code", "promo_code" ]
		) {
			expect( html ).not.toContain( name )
		}
	})

	it("offers Register Now, advertising the main event's dates", async () => {
		const { html } = await website.get( PAGE_PATH )

		expect( html ).toContain( "Register Now" )

		// The trigger at the foot of the page is client-only — the popup it
		// opens needs JavaScript, and a server-rendered trigger would be a
		// dead control until hydration. So the RSVP line is not in the markup;
		// the header's button is.
		expect( html ).toContain( "aria-haspopup=\"dialog\"" )
	})
})

describe("minting a token", () => {
	it("hands over a token and the honeypot's name, uncacheable", async () => {
		const { body, headers, status } = await website.json( TOKEN_PATH, {
			address: "203.0.113.10",
			method: "GET",
		} )

		expect( status ).toBe( 200 )
		expect( typeof body.token ).toBe( "string" )
		expect( typeof body.honeypot ).toBe( "string" )

		// An intermediary that cached this would hand one token to everybody
		// it served, which is the exact failure the lazy mint exists to avoid.
		expect( headers.get( "cache-control" ) ).toContain( "no-store" )
	})

	it("does not name the honeypot anything a bot already skips", async () => {
		const { honeypot } = await mint( "203.0.113.11" )

		// The first generation of this trick, and therefore the first thing on
		// every skip list.
		expect( [ "url", "website", "homepage", "email2", "name2" ] )
			.not.toContain( honeypot )
	})
})

describe("submitting", () => {
	it("records a registration, with the consent the server stamped", async () => {
		const address = "203.0.113.20"
		const { honeypot, token } = await mint( address )

		await new Promise( ( resolve ) =>
			setTimeout( resolve, YOUNGEST_MS + 200 )
		)

		const before = website.cms.leads.length

		const { body, status } = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
		} )

		expect( status ).toBe( 201 )
		expect( body.recorded ).toBe( true )

		expect( website.cms.leads ).toHaveLength( before + 1 )

		const sent = website.cms.leads[before]

		// The API token stays server-side. It is on the request the server
		// made, and the browser never saw it.
		expect( sent.authorization ).toBe(
			"Bearer test-registration-relay-token",
		)

		const { data } = sent.body

		expect( data.name_first ).toBe( "Ada" )
		expect( data.email_address ).toBe( "ada@example.com" )
		expect( data.institution ).toBe( "Analytical Engines" )
		expect( data.interests ).toBe( "workshops, conversations" )

		// The consent: set by the server, and carrying the wording rather than
		// a flag. Neither of these was in the body the browser sent.
		expect( data.consent_given ).toBe( true )
		expect( data.consent_at ).toBeTruthy()
		expect( data.consent_text ).toContain( "Privacy Notice" )
		expect( data.consent_text ).toContain( "accurate" )
	})

	it("refuses a second submission with the same token", async () => {
		const address = "203.0.113.21"
		const { honeypot, token } = aged_token( address, 10_000 )

		const first = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
		} )

		expect( first.status ).toBe( 201 )

		const before = website.cms.leads.length

		const second = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
		} )

		expect( second.status ).toBe( 400 )
		expect( website.cms.leads ).toHaveLength( before )
	})

	it("refuses a submission that arrived too fast", async () => {
		const address = "203.0.113.22"
		const { honeypot, token } = await mint( address )

		const before = website.cms.leads.length

		const { status } = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
		} )

		expect( status ).toBe( 400 )
		expect( website.cms.leads ).toHaveLength( before )
	})

	it("refuses a submission whose form has been open too long", async () => {
		const address = "203.0.113.23"
		const { honeypot, token } = aged_token( address, 31 * 60 * 1000 )

		const before = website.cms.leads.length

		const { status } = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
		} )

		expect( status ).toBe( 400 )
		expect( website.cms.leads ).toHaveLength( before )
	})

	it("refuses a submission carrying no token at all", async () => {
		const before = website.cms.leads.length

		const { status } = await submit( "203.0.113.24", a_submission() )

		expect( status ).toBe( 400 )
		expect( website.cms.leads ).toHaveLength( before )
	})

	it("refuses a token whose payload has been edited", async () => {
		const address = "203.0.113.25"
		const { honeypot, token } = aged_token( address, 10_000 )

		// The issue time, moved forward. Everything else is untouched, so only
		// the signature can notice.
		const parts = token.split( "." )
		parts[1] = String( Number( parts[1] ) + 60_000 )

		const before = website.cms.leads.length

		const { status } = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: parts.join( "." ),
		} )

		expect( status ).toBe( 400 )
		expect( website.cms.leads ).toHaveLength( before )
	})
})

describe("the honeypot", () => {
	it("discards a filled trap, and says nothing about it", async () => {
		const address = "203.0.113.30"
		const { honeypot, token } = aged_token( address, 10_000 )

		const before = website.cms.leads.length

		const { body, status } = await submit( address, {
			...a_submission(),
			[honeypot]: "GCC-2025-REFERRAL",
			form_token: token,
		} )

		// Thanked, not refused. A script told it failed learns the trap is
		// there; one that is thanked goes away satisfied.
		expect( status ).toBe( 200 )
		expect( body.recorded ).toBe( true )

		// And nothing was recorded.
		expect( website.cms.leads ).toHaveLength( before )
	})

	it("is not what refuses an ordinary empty submission", async () => {
		const address = "203.0.113.31"
		const { honeypot, token } = aged_token( address, 10_000 )

		// A browser submits an untouched text input as `""`, and the schema
		// rejects unknown fields outright — so the trap has to be stripped
		// before parsing rather than tripping either check.
		const { status } = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
		} )

		expect( status ).toBe( 201 )
	})
})

describe("the schema", () => {
	it("rejects a field the form never had", async () => {
		const address = "203.0.113.40"
		const { honeypot, token } = aged_token( address, 10_000 )

		const before = website.cms.leads.length

		const { status } = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
			is_administrator: true,
		} )

		expect( status ).toBe( 400 )
		expect( website.cms.leads ).toHaveLength( before )
	})

	it("rejects a string longer than the CMS could store", async () => {
		const address = "203.0.113.41"
		const { honeypot, token } = aged_token( address, 10_000 )

		const { status } = await submit( address, {
			...a_submission( { first_name: "a".repeat( 5000 ) } ),
			[honeypot]: "",
			form_token: token,
		} )

		expect( status ).toBe( 400 )
	})

	it("rejects an occupation this form never offered", async () => {
		const address = "203.0.113.42"
		const { honeypot, token } = aged_token( address, 10_000 )

		const { status } = await submit( address, {
			...a_submission( { occupation: "pirate" } ),
			[honeypot]: "",
			form_token: token,
		} )

		expect( status ).toBe( 400 )
	})

	it("rejects a submission that withheld consent", async () => {
		const address = "203.0.113.43"
		const { honeypot, token } = aged_token( address, 10_000 )

		const before = website.cms.leads.length

		const { status } = await submit( address, {
			...a_submission( { privacy_consent: false } ),
			[honeypot]: "",
			form_token: token,
		} )

		expect( status ).toBe( 400 )
		expect( website.cms.leads ).toHaveLength( before )
	})
})

describe("IP binding", () => {
	/*
	 | The open call on this ticket, and it went to "soft". A mobile handover
	 | and a VPN reconnect look exactly like this, and what they would see from
	 | a hard check is a failure they can neither diagnose nor work around.
	 */
	it("accepts a submission from a different address than the mint", async () => {
		const { honeypot, token } = aged_token( "203.0.113.50", 10_000 )

		const { status } = await submit( "198.51.100.50", {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
		} )

		expect( status ).toBe( 201 )
	})
})

describe("the rate limit", () => {
	it("cuts an address off after five attempts in a minute", async () => {
		const address = "203.0.113.60"

		const statuses: number[] = []

		for ( let attempt = 0; attempt < 6; attempt += 1 ) {
			const { status } = await website.json( TOKEN_PATH, {
				address,
				method: "GET",
			} )

			statuses.push( status )
		}

		expect( statuses.slice( 0, 5 ) ).toEqual( [ 200, 200, 200, 200, 200 ] )
		expect( statuses[5] ).toBe( 429 )
	})

	it("tells a refused caller how long to wait", async () => {
		const address = "203.0.113.61"

		for ( let attempt = 0; attempt < 5; attempt += 1 ) {
			await website.json( TOKEN_PATH, { address, method: "GET" } )
		}

		const { headers, status } = await website.json( TOKEN_PATH, {
			address,
			method: "GET",
		} )

		expect( status ).toBe( 429 )
		expect( Number( headers.get( "retry-after" ) ) ).toBeGreaterThan( 0 )
	})

	it("counts the two endpoints together, per address", async () => {
		const address = "203.0.113.62"

		// Three mints and two submissions is five, and the sixth is refused
		// whichever endpoint it arrives at.
		for ( let attempt = 0; attempt < 3; attempt += 1 ) {
			await website.json( TOKEN_PATH, { address, method: "GET" } )
		}

		await submit( address, { form_token: "nonsense" } )
		await submit( address, { form_token: "nonsense" } )

		const { status } = await submit( address, { form_token: "nonsense" } )

		expect( status ).toBe( 429 )
	})
})

describe("a token that has been handed over once", () => {
	/*
	 | The reason `use-form-token.ts` tracks "spent" rather than just holding a
	 | token: verification happens BEFORE the CMS is asked for anything, so a
	 | submission that fails at the CMS has still burned its token. A form that
	 | retried with the same one would fail identically for ever.
	 */
	it("is refused as a replay even though nothing was recorded", async () => {
		const address = "203.0.113.80"
		const { honeypot, token } = aged_token( address, 10_000 )

		website.cms.refuse_leads = true

		try {
			const refused = await submit( address, {
				...a_submission(),
				[honeypot]: "",
				form_token: token,
			} )

			expect( refused.status ).toBe( 502 )
		} finally {
			website.cms.refuse_leads = false
		}

		const before = website.cms.leads.length

		// The CMS is willing again, and the same token still fails — which is
		// exactly why the browser must not send it a second time.
		const replayed = await submit( address, {
			...a_submission(),
			[honeypot]: "",
			form_token: token,
		} )

		expect( replayed.status ).toBe( 400 )
		expect( website.cms.leads ).toHaveLength( before )

		// A fresh one goes through, which is what the form does instead.
		const fresh = aged_token( address, 10_000 )

		const retried = await submit( address, {
			...a_submission(),
			[fresh.honeypot]: "",
			form_token: fresh.token,
		} )

		expect( retried.status ).toBe( 201 )
	})
})

describe("when the CMS refuses", () => {
	it("does not tell the visitor what the CMS said", async () => {
		const address = "203.0.113.70"
		const { honeypot, token } = aged_token( address, 10_000 )

		website.cms.refuse_leads = true

		try {
			const { body, status } = await submit( address, {
				...a_submission(),
				[honeypot]: "",
				form_token: token,
			} )

			expect( status ).toBe( 502 )
			expect( JSON.stringify( body ) ).not.toContain( "refused" )
		} finally {
			website.cms.refuse_leads = false
		}
	})
})
