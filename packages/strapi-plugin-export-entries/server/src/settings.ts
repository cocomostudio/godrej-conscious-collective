
import type { Core } from "@strapi/strapi"

export const PLUGIN_ID = "export-entries"

export type Settings = {
	/** Content-type IDs that get the Export button, e.g. `api::lead.lead`. */
	content_types: string[]
	/** The IANA timezone that dates are read and written in. */
	timezone: string
	/** The sizes offered as "Latest N". */
	presets: number[]
}

/**
 |
 | The plugin's settings, as `config/plugins.ts` sees them before overriding.
 |
 | Each default is the raw env var **string**, never an array. The presets
 | default is left undefined when its env var is unset, because a present but
 | empty env var means "no presets" rather than "the default presets".
 |
 | Strapi merges
 | `config/plugins.ts` over these defaults with a deep merge, and a deep merge
 | fills an array index by index. An array default would therefore leak its
 | tail into a shorter array set in code: `[ 10 ]` over `[ 50, 100, 250 ]`
 | becomes `[ 10, 100, 250 ]`. A string default is replaced whole.
 |
 */
export const config = {
	default: (
		{ env }: { env: ( key: string, fallback?: string ) => string },
	) => ( {
		content_types: env( "EXPORT_ENTRIES_CONTENT_TYPES", "" ),
		timezone: env( "EXPORT_ENTRIES_TIMEZONE", "" ),
		presets: env( "EXPORT_ENTRIES_PRESETS" ),
	} ),
	validator ( raw: Record<string, unknown> ) {
		parse_settings( raw )
	},
}

/**
 |
 | Reads the settings and checks them against the content-types this Strapi
 | instance actually has. Throws, naming the bad value, on the first setting
 | that is wrong. A throw here refuses the boot.
 |
 */
export function read_settings ( strapi: Core.Strapi ): Settings {
	const settings = parse_settings(
		strapi.config.get( `plugin::${PLUGIN_ID}` ),
	)

	for ( const uid of settings.content_types ) {
		check_content_type( strapi, uid )
	}

	return settings
}

function parse_settings ( raw: Record<string, unknown> ): Settings {
	return {
		content_types: list_of( raw.content_types ),
		presets: parse_presets( raw.presets ),
		timezone: parse_timezone( raw.timezone ),
	}
}

/** Accepts a comma-separated string, or an array set in code. */
function list_of ( value: unknown ): string[] {
	const items = Array.isArray( value )
		? value
		: String( value ?? "" ).split( "," )

	return items.map( ( item ) => String( item ).trim() )
		.filter( ( item ) => item !== "" )
}

function parse_timezone ( value: unknown ): string {
	const timezone = String( value ?? "" ).trim()

	if ( timezone === "" ) {
		return "UTC"
	}

	try {
		new Intl.DateTimeFormat( "en", { timeZone: timezone } )
	} catch {
		throw new Error(
			`The export-entries timezone "${timezone}" is not an IANA timezone `
				+ `name, such as "Europe/London".`,
		)
	}

	return timezone
}

function parse_presets ( value: unknown ): number[] {
	if ( value === undefined || value === null ) {
		return [ 50, 100, 250 ]
	}

	return list_of( value ).map( ( item ) => {
		if ( !/^[0-9]+$/.test( item ) || Number( item ) === 0 ) {
			throw new Error(
				`The export-entries preset "${item}" is not a positive whole `
					+ `number.`,
			)
		}

		return Number( item )
	} )
}

function check_content_type ( strapi: Core.Strapi, uid: string ) {
	const content_type = strapi.contentTypes[uid as any]

	if ( !content_type ) {
		throw new Error(
			`The export-entries content-type "${uid}" does not exist.`,
		)
	}

	if ( content_type.kind !== "collectionType" ) {
		throw new Error(
			`The export-entries content-type "${uid}" is a single type. Only `
				+ `collection types can be exported.`,
		)
	}

	if ( ( content_type.pluginOptions as any )?.i18n?.localized === true ) {
		throw new Error(
			`The export-entries content-type "${uid}" is localised. Localised `
				+ `content-types cannot be exported.`,
		)
	}

	for (
		const [ name, attribute ] of Object.entries( content_type.attributes )
	) {
		const refused = REFUSED_ATTRIBUTE_TYPES[attribute.type]

		if ( refused ) {
			throw new Error(
				`The export-entries content-type "${uid}" holds the field `
					+ `"${name}", which is a ${refused}. Content-types holding `
					+ `components or dynamic zones cannot be exported.`,
			)
		}
	}
}

const REFUSED_ATTRIBUTE_TYPES: Record<string, string> = {
	component: "component",
	dynamiczone: "dynamic zone",
}
