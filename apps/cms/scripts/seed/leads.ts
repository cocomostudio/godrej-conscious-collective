
/**
 |
 | Ten Leads.
 |
 | The one content type here a member of the public writes, so these are the one
 | kind of row the seed produces that nobody in the admin typed. They exist so
 | that the Leads list is not empty the first time somebody with the right role
 | opens it — an empty grid teaches nothing about what a registration looks
 | like, and the retention date in particular is the sort of thing best seen
 | filled in.
 |
 | Written through the document service like everything else, which means the
 | Lead controller's server-side stamping does **not** run over them — that
 | belongs to the HTTP create path. So the three things it would have set are
 | set here, the same way it would set them: the consent wording as it stood,
 | the consent time, and the retention date computed from the **main** event's
 | end date plus twelve months.
 |
 | The consent sentence is written out rather than imported. The wording the
 | website actually serves lives in the website, and the CMS cannot reach
 | across to it; more to the point it *should* not, because the whole reason
 | this attribute exists is that the wording changes and a record has to keep
 | the version it was shown. A seed row is a record of a sentence that was
 | never on screen anywhere, so it carries a plausible copy and nothing depends
 | on the two agreeing.
 |
 */

import type { Seeded_Events } from "./events.ts"
import type { Strapi } from "./lib/strapi.ts"

import { retain_until } from "../../src/this/api/lead/retention.ts"
const CONSENT_TEXT =
	"I have read the Privacy Notice and hereby provide my consent to process "
	+ "the information for the purposes defined in the notice. I hereby "
	+ "declare that the information provided by me is accurate."

const LEADS = [
	{
		email_address: "meera.raghavan@example.com",
		institution: "Studio Kaash",
		interests: "showcases, workshops",
		name_first: "Meera",
		name_last: "Raghavan",
		occupation: "practicing-architect",
		phone_number: "+91 98200 41172",
	},
	{
		email_address: "d.fernandes@example.com",
		institution: "Rachana Sansad",
		interests: "conversations",
		name_first: "Dominic",
		name_last: "Fernandes",
		occupation: "student-architect",
		phone_number: "+91 99301 55820",
	},
	{
		email_address: "ananya.b@example.com",
		institution: "Tiled Ground",
		interests: "experiences, workshops",
		name_first: "Ananya",
		name_last: "Bhattacharya",
		occupation: "practicing-interior-designer",
		phone_number: "+91 98670 20913",
	},
	{
		email_address: "rohit.sethi@example.com",
		institution: "Godrej Design Lab",
		interests: "showcases, experiences, conversations, workshops",
		name_first: "Rohit",
		name_last: "Sethi",
		occupation: "practicing-product-designer",
		phone_number: "+91 90040 78261",
	},
	{
		email_address: "farah.q@example.com",
		institution: "Sir J. J. School of Art",
		interests: "showcases",
		name_first: "Farah",
		name_last: "Qureshi",
		occupation: "student-interior-designer",
		phone_number: "+91 91670 33408",
	},
	{
		email_address: "vikram.n@example.com",
		institution: "Nadkarni & Partners",
		interests: "conversations, workshops",
		name_first: "Vikram",
		name_last: "Nadkarni",
		occupation: "practicing-architect",
		phone_number: "022 2518 8010",
	},
	{
		email_address: "shreya.pillai@example.com",
		institution: "MIT Institute of Design",
		interests: "experiences",
		name_first: "Shreya",
		name_last: "Pillai",
		occupation: "student-product-designer",
		phone_number: "+91 88790 61254",
	},
	{
		email_address: "imran.s@example.com",
		institution: "Loam Collective",
		interests: "showcases, conversations",
		name_first: "Imran",
		name_last: "Shaikh",
		occupation: "other",
		phone_number: "+91 97020 14477",
	},
	{
		email_address: "kavya.menon@example.com",
		institution: "CEPT University",
		interests: "workshops",
		name_first: "Kavya",
		name_last: "Menon",
		occupation: "student-architect",
		phone_number: "+91 95940 82013",
	},
	{
		email_address: "t.dorjee@example.com",
		institution: "High Passes Studio",
		interests: "experiences, conversations",
		name_first: "Tenzin",
		name_last: "Dorjee",
		occupation: "practicing-interior-designer",
		phone_number: "+91 89760 51120",
	},
]

export async function write_leads (
	strapi: Strapi,
	events: Seeded_Events,
) {
	// Fixed rather than "now", so that a reseed produces the same rows twice
	// and a diff of two databases is about what changed rather than about when
	// the seed ran. The days are spread out because a registration list that
	// arrived all in one second reads as machine-made, which it is, but the
	// point of sample content is to exercise what real content looks like.
	const first_consent = Date.UTC( 2025, 8, 14, 9, 12, 0 )
	const a_day = 24 * 60 * 60 * 1000

	for ( const [ position, lead ] of LEADS.entries() ) {
		await strapi.documents( "api::lead.lead" ).create( {
			data: {
				...lead,
				consent_at: new Date(
					first_consent + position * 3 * a_day,
				).toISOString(),
				consent_given: true,
				consent_text: CONSENT_TEXT,
				event: events.main.documentId,
				retain_until: retain_until( events.main.date_end ),
			},
		} )
	}
}
