
import type { Core } from "@strapi/strapi"
import { contentTypes, errors } from "@strapi/utils"

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
 | A date range includes both its start day and its end day.
 |
 */
export type Selection =
	| { kind: "latest"; count: number }
	| { kind: "period"; period: Period; days: Day_Range }
	| { kind: "range"; days: Day_Range }

/**
 |
 | Which version of each entry of a Draft & Publish content-type an export
 | reads:
 |
 | - `published`: the published version of each published entry.
 | - `draft`: the draft of each entry that has never been published.
 | - `all`: the draft of every entry, which is what the edit view shows.
 |
 */
export type Status = "published" | "draft" | "all"

const STATUSES: Status[] = [ "published", "draft", "all" ]

/** A request for an export, checked and ready to run. */
export type Export_Request = {
	uid: string
	selection: Selection
	/** Unset for a content-type without Draft & Publish. */
	status?: Status
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
	const content_type = strapi.contentTypes[uid as any]
	const status = check_status(
		body?.status,
		contentTypes.hasDraftAndPublish( content_type ),
	)
	const plural = content_type.info.pluralName

	return {
		fields,
		file_name: selection.kind === "latest"
			? `${plural}_latest-${selection.count}_${
				day_in( settings.timezone, now )
			}.csv`
			: `${plural}_${selection.days.start}_to_${selection.days.end}.csv`,
		selection,
		status,
		uid,
	}
}

/**
 |
 | A Draft & Publish content-type needs a status. Any other content-type has
 | only one version of each entry, so a status there is refused rather than
 | ignored.
 |
 */
function check_status (
	status: unknown,
	draft_and_publish: boolean,
): Status | undefined {
	if ( !draft_and_publish ) {
		if ( status !== undefined ) {
			throw new errors.ValidationError(
				"The content-type has no Draft & Publish, so it takes no status.",
			)
		}

		return undefined
	}

	if ( !STATUSES.includes( status as Status ) ) {
		throw new errors.ValidationError(
			`The status must be one of ${STATUSES.join( ", " )}.`,
		)
	}

	return status as Status
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

		const as_of = check_day(
			selection.as_of ?? day_in( settings.timezone, now ),
		)

		return {
			days: resolve_period( selection.period, as_of ),
			kind: "period",
			period: selection.period,
		}
	}

	if ( selection?.kind === "range" ) {
		const start = check_day( selection.start )
		const end = check_day( selection.end )

		// Days written as `YYYY-MM-DD` sort the same as text and as dates.
		if ( end < start ) {
			throw new errors.ValidationError(
				`The end date ${end} falls before the start date ${start}.`,
			)
		}

		return { days: { end, start }, kind: "range" }
	}

	throw new errors.ValidationError(
		"The selection must be a preset, a calendar period or a date range.",
	)
}

function check_day ( value: unknown ): string {
	if ( !is_day( value ) ) {
		throw new errors.ValidationError(
			`"${value}" is not a day written as YYYY-MM-DD.`,
		)
	}

	return value
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
