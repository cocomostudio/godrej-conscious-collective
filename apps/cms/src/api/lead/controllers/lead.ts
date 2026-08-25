
/**
 |
 | Lead controller — one method, because one route composes onto it.
 |
 | Everything a caller sends is read through an **allowlist**. Not for the
 | validation (the relay already parsed the body against a schema that rejects
 | unknown fields outright), but because three of this content type's attributes
 | are not the caller's to set at all, and a spread would let a future caller
 | set them without anyone noticing:
 |
 |   `event`         the event that was main when the registration arrived
 |   `retain_until`  that event's end date plus twelve months
 |   `consent_at`    when the consent was taken
 |
 | The first two are decided **here**, because the main event is a fact only the
 | CMS holds. The consent wording travels with the submission: the website's
 | server is the one that rendered the sentence the visitor ticked a box beside,
 | so it is the only party that can say what was agreed to — and it is a server,
 | which is the whole of what "never by the client" asks for. The browser's copy
 | of the body never reaches this method: the relay builds its own.
 |
 | **The response says nothing back.** A create route that echoed the record
 | would be a read path wearing a POST, and the point of this content type is
 | that it has no read path. The document id is enough for a caller to know the
 | write happened.
 |
 */

import { factories } from "@strapi/strapi"

import { retain_until } from "../../../this/api/lead/retention"

const UID = "api::lead.lead"
const EVENT_UID = "api::event.event"

/**
 |
 | What a caller may set. Every other attribute on the schema is the server's.
 |
 */
const FROM_THE_CALLER = [
	"name_first",
	"name_last",
	"email_address",
	"phone_number",
	"institution",
	"occupation",
	"interests",
	"consent_given",
	"consent_text",
	"consent_at",
] as const

export default factories.createCoreController( UID, ( { strapi } ) => ( {
	async create ( ctx ) {
		const body = ctx.request.body?.data

		if ( !body || typeof body !== "object" ) {
			return ctx.badRequest( `"data" is required.` )
		}

		// Refused rather than stored as `false`. The whole reason this content
		// type carries consent attributes is that a record has to be able to
		// say what was agreed to, and a row saying nothing was agreed to is a
		// personal record held with no basis for holding it.
		if ( body.consent_given !== true ) {
			return ctx.badRequest(
				`"consent_given" must be true. A submission without consent `
					+ `is not recorded.`,
			)
		}

		/*
		 | The wording is required on the schema too, so this is not what
		 | enforces it — the document service would refuse the write either
		 | way. What this buys is the DIFFERENCE BETWEEN A 400 AND A 500: a
		 | caller who left the wording out has made a mistake they can fix,
		 | and being told so is more use than a validation error surfacing as
		 | an internal one.
		 |
		 | And the rule is worth stating twice, because it is the whole reason
		 | this content type carries the attribute: a record of personal data
		 | that cannot say what was agreed to is not a consent record.
		 */
		if (
			typeof body.consent_text !== "string"
			|| body.consent_text.trim() === ""
		) {
			return ctx.badRequest(
				`"consent_text" is required, and must carry the exact wording `
					+ `that was on screen. A consent record that cannot say what `
					+ `was consented to is not a record.`,
			)
		}

		const data: Record<string, unknown> = {}

		for ( const attribute of FROM_THE_CALLER ) {
			if ( body[attribute] !== undefined ) {
				data[attribute] = body[attribute]
			}
		}

		// The relay stamps this, and this fills it in when it did not — a
		// consent record with no time on it is worth less than one stamped a
		// few milliseconds late.
		data.consent_at = data.consent_at ?? new Date().toISOString()

		const main = await main_event( strapi )

		data.event = main?.documentId ?? null
		data.retain_until = retain_until( main?.date_end )

		const lead = await strapi.documents( UID ).create( { data } as any )

		ctx.status = 201

		return { data: { documentId: lead.documentId } }
	},
} ) )

/**
 |
 | The event that is main right now.
 |
 | `strapi.db.query` rather than the document service, matching the middlewares:
 | a document-service read taken from inside a write path re-enters the
 | middleware chain from index zero.
 |
 */
async function main_event ( strapi ) {
	return await strapi.db.query( EVENT_UID ).findOne( {
		select: [ "documentId", "date_end" ],
		where: { main: true },
	} ) as { documentId: string; date_end: string | null } | null
}
