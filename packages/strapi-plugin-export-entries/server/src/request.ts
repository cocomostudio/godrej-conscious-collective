
import type { Core } from "@strapi/strapi"
import { errors } from "@strapi/utils"

import {
	type Day_Range,
	day_in,
	is_day,
	type Period,
	PERIODS,
	resolve_period,
} from "./calendar"
import type { Field } from "./describe"
import type { Settings } from "./settings"

/**
 |
 | Which entries an export reads. A calendar period is resolved to its days
 | when the ticket is requested, so an export that runs past midnight still
 | reads the days the admin asked for.
 |
 | A calendar period is read from the day the modal showed it on, when the
 | request names one. So a modal left open past midnight exports the days its
 | labels show.
 |
 */
export type Selection =
	| { kind: "latest"; count: number }
	| { kind: "period"; period: Period; days: Day_Range }

/** A request for an export, checked and ready to run. */
export type Export_Request = {
	uid: string
	selection: Selection
	/** The chosen fields, in the order their columns come. */
	fields: Field[]
	file_name: string
}

/**
 |
 | Checks the body of a Request ticket call against the content-type's
 | exportable fields and the plugin's settings. Throws a validation error,
 | which Strapi answers with a 400, on the first thing that is wrong.
 |
 */
export function check_request (
	strapi: Core.Strapi,
	body: any,
	exportable: Field[],
	settings: Settings,
	now: Date,
): Export_Request {
	const uid = String( body?.uid )
	const selection = check_selection( body?.selection, settings, now )
	const fields = check_fields( body?.fields, exportable )
	const plural = strapi.contentTypes[uid as any].info.pluralName

	return {
		fields,
		file_name: selection.kind === "latest"
			? `${plural}_latest-${selection.count}_${
				day_in( settings.timezone, now )
			}.csv`
			: `${plural}_${selection.days.start}_to_${selection.days.end}.csv`,
		selection,
		uid,
	}
}

function check_selection (
	selection: any,
	settings: Settings,
	now: Date,
): Selection {
	if ( selection?.kind === "latest" ) {
		if ( !settings.presets.includes( selection.count ) ) {
			throw new errors.ValidationError(
				`"Latest ${selection.count}" is not one of the presets.`,
			)
		}

		return { count: selection.count, kind: "latest" }
	}

	if ( selection?.kind === "period" ) {
		if ( !PERIODS.includes( selection.period ) ) {
			throw new errors.ValidationError(
				`"${selection.period}" is not a calendar period.`,
			)
		}

		const as_of = selection.as_of ?? day_in( settings.timezone, now )

		if ( !is_day( as_of ) ) {
			throw new errors.ValidationError(
				`"${as_of}" is not a day written as YYYY-MM-DD.`,
			)
		}

		return {
			days: resolve_period( selection.period, as_of ),
			kind: "period",
			period: selection.period,
		}
	}

	throw new errors.ValidationError(
		"The selection must be a preset or a calendar period.",
	)
}

/** Answers the chosen fields in the order the exportable fields come. */
function check_fields ( names: unknown, exportable: Field[] ): Field[] {
	if ( !Array.isArray( names ) ) {
		throw new errors.ValidationError( "The fields must be a list." )
	}

	for ( const name of names ) {
		if ( !exportable.some( ( field ) => field.name === name ) ) {
			throw new errors.ValidationError(
				`"${name}" is not an exportable field.`,
			)
		}
	}

	return exportable.filter( ( field ) => names.includes( field.name ) )
}
