
/**
 |
 | The one call the website makes to record a registration.
 |
 | `.server.ts` for the same reason as `fetch-envelope.server.ts`, and with more
 | riding on it: this module holds the **API token**, and the token must never
 | reach the browser bundle. A route module's imports are stripped only while
 | the import is reachable from server-only exports alone, and the suffix is
 | what makes that guarantee rather than a hope.
 |
 | The CMS decides two of the record's attributes for itself — the event that
 | was main when the registration arrived, and the retention date twelve months
 | past that event's end — because they are facts only the CMS holds. What
 | travels from here is the visitor's answers and **the consent**: the time, and
 | the exact sentences that were on screen beside the box they ticked. This is
 | the last server that knows what was rendered, so it is the only one that can
 | say what was agreed to.
 |
 */

import type { Submission } from "./submission.ts"

import { consent_wording } from "./submission.ts"

import { Environment } from "#infra/server/environment/index.ts"

export type Relayed =
	| { recorded: true }
	| { recorded: false; reason: "unconfigured" | "refused" }

export async function relay_submission (
	submission: Submission,
): Promise<Relayed> {
	const token = Environment.get( "CMS_API_TOKEN" )

	if ( !token ) {
		console.error(
			`CMS_API_TOKEN is unset, so the registration could not be `
				+ `recorded. The form is live and answering; nothing it collects `
				+ `is being kept.`,
		)

		return { reason: "unconfigured", recorded: false }
	}

	const url = new URL( "/api/leads", Environment.get( "CMS_URL" ) )

	const response = await fetch( url, {
		body: JSON.stringify( {
			data: {
				// Stamped here, never taken from the browser. The browser's
				// copy of the body has no consent time and no wording in it at
				// all — see `submit.route.ts`, where the schema that rejects
				// unknown fields would refuse them if it did.
				consent_at: new Date().toISOString(),
				consent_given: true,
				consent_text: consent_wording(),

				email_address: submission.email,
				institution: submission.company_or_school,
				// Stored as the form's own slugs, comma separated, so the
				// labels can be reworded without invalidating anything already
				// submitted.
				interests: submission.interests.join( ", " ),
				name_first: submission.first_name,
				name_last: submission.last_name,
				occupation: submission.occupation,
				phone_number: submission.mobile,
			},
		} ),
		headers: {
			"authorization": `Bearer ${token}`,
			"content-type": "application/json",
		},
		method: "POST",
	} )

	if ( !response.ok ) {
		// The body is read and logged rather than forwarded. A CMS validation
		// message is written for whoever wrote the caller, not for somebody
		// filling in a registration form, and passing it through would hand a
		// stranger a description of the content model.
		console.error(
			`The CMS answered ${response.status} to a registration: `
				+ `${await response.text()}`,
		)

		return { reason: "refused", recorded: false }
	}

	return { recorded: true }
}
