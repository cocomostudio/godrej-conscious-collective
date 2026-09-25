
import type { Core } from "@strapi/strapi"
import { contentTypes } from "@strapi/utils"

import {
	type Day_Range,
	day_in,
	type Period,
	PERIODS,
	resolve_period,
} from "./calendar"
import type { Settings } from "./settings"

export type Field = {
	/** The attribute's key, e.g. `phone_number`. */
	name: string
	/** The label the edit view shows, e.g. "Mobile". */
	label: string
}

export type Description = {
	fields: Field[]
	draft_and_publish: boolean
	timezone: string
	presets: number[]
	/** Today, in the timezone setting, as `YYYY-MM-DD`. */
	today: string
	/** The days each calendar period covers, as seen from `today`. */
	periods: ( { period: Period } & Day_Range )[]
}

/**
 |
 | What the Export modal needs to know about one content-type.
 |
 | The fields come in the content manager's edit-view order, under the labels
 | an admin sees there. A field removed from the edit view is still exported,
 | and is listed after the fields the edit view shows, in schema order.
 |
 */
export async function describe_content_type (
	strapi: Core.Strapi,
	uid: string,
	settings: Settings,
): Promise<Description> {
	const content_type = strapi.contentTypes[uid as any]
	const { layouts, metadatas } = await strapi.plugin( "content-manager" )
		.service( "content-types" )
		.findConfiguration( content_type )

	const shown = ( layouts.edit as { name: string }[][] ).flat()
		.map( ( { name } ) => name )
	const removed = contentTypes.getVisibleAttributes( content_type )
		.filter( ( name ) => !shown.includes( name ) )

	const fields = [ ...shown, ...removed ]
		.filter( ( name ) => is_exportable( content_type, name ) )
		.map( ( name ) => ( {
			label: metadatas[name]?.edit?.label || name,
			name,
		} ) )

	const today = day_in( settings.timezone, new Date() )

	return {
		draft_and_publish: contentTypes.hasDraftAndPublish( content_type ),
		fields,
		periods: PERIODS.map( ( period ) => ( {
			period,
			...resolve_period( period, today ),
		} ) ),
		presets: settings.presets,
		timezone: settings.timezone,
		today,
	}
}

/**
 |
 | Only scalar fields are exported. A password is never exported, because the
 | content API never hands one out either.
 |
 */
function is_exportable ( content_type: any, name: string ) {
	const attribute = content_type.attributes[name]

	return Boolean( attribute )
		&& contentTypes.isScalarAttribute( attribute )
		&& attribute.type !== "password"
		&& !contentTypes.isPrivateAttribute( content_type, name )
}
