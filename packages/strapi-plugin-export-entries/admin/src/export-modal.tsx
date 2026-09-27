
import {
	Button,
	Checkbox,
	DatePicker,
	Field,
	Flex,
	Modal,
	Radio,
	SingleSelect,
	SingleSelectOption,
	Typography,
} from "@strapi/design-system"
import { useFetchClient } from "@strapi/strapi/admin"
import { useState } from "react"

/** What the server's Describe endpoint answers. */
export type Description = {
	fields: { name: string; label: string }[]
	draft_and_publish: boolean
	timezone: string
	presets: number[]
	/** The day the periods are seen from, as `YYYY-MM-DD`. */
	today: string
	periods: Period_Days[]
}

/** The days a calendar period covers, as of now, as `YYYY-MM-DD`. */
type Period_Days = { period: Period; start: string; end: string }

type Period =
	| "today"
	| "yesterday"
	| "this_week"
	| "last_week"
	| "this_month"
	| "last_month"
	| "this_year"
	| "last_year"

/** Whether the admin picks a preset or a custom date range. */
type Mode = "preset" | "range"

/** Which version of each entry a Draft & Publish content-type exports. */
type Status = "published" | "draft" | "all"

type Ticket_Answer =
	| { outcome: "no_entries" }
	| { outcome: "export_running" }
	| { outcome: "ticket"; ticket: string; count: number; file_name: string }


export function Export_Modal (
	{ uid, description, on_started }: {
		uid: string
		description: Description
		/** Called once the browser has been handed the download. */
		on_started: () => void
	},
) {
	const { post } = useFetchClient()
	const [ preset, set_preset ] = useState<string>(
		() => description.presets.length > 0
			? `latest:${description.presets[0]}`
			: `period:${description.periods[0]?.period}`,
	)
	const [ mode, set_mode ] = useState<Mode>( "preset" )
	const [ status, set_status ] = useState<Status>( "published" )
	const [ start, set_start ] = useState<string>()
	const [ end, set_end ] = useState<string>()
	const [ chosen, set_chosen ] = use_remembered_fields( uid, description )
	const [ message, set_message ] = useState<string | null>( null )
	const [ busy, set_busy ] = useState( false )

	const both_days_picked = start !== undefined && end !== undefined
	// Days written as `YYYY-MM-DD` sort the same as text and as dates.
	const end_before_start = both_days_picked && end < start
	const can_export = mode === "preset"
		|| ( both_days_picked && !end_before_start )

	const toggle = ( name: string, ticked: boolean ) => {
		const next = new Set( chosen )

		if ( ticked ) {
			next.add( name )
		} else {
			next.delete( name )
		}

		set_chosen( next )
	}

	const start_export = async () => {
		set_busy( true )
		set_message( null )

		try {
			const { data } = await post<{ data: Ticket_Answer }>(
				"/export-entries/tickets",
				{
					fields: description.fields
						.filter( ( field ) => chosen.has( field.name ) )
						.map( ( field ) => field.name ),
					selection: mode === "preset"
						? selection_of( preset, description.today )
						: { end, kind: "range", start },
					...( description.draft_and_publish ? { status } : {} ),
					uid,
				},
			)

			if ( data.data.outcome === "no_entries" ) {
				set_message( "No entries match." )
				return
			}

			if ( data.data.outcome === "export_running" ) {
				set_message( "An export is already running." )
				return
			}

			download( data.data.ticket, data.data.file_name )
			on_started()
		} catch {
			set_message( "The export could not start. Please try again." )
		} finally {
			set_busy( false )
		}
	}

	return (
		<Modal.Content>
			<Modal.Header>
				<Modal.Title>Export entries</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Flex alignItems="stretch" direction="column" gap={ 6 }>
					<Radio.Group
						aria-label="Which entries"
						onValueChange={ ( value ) =>
							set_mode( value as Mode ) }
						value={ mode }
					>
						<Radio.Item value="preset">Preset</Radio.Item>
						<Radio.Item value="range">Custom date range</Radio.Item>
					</Radio.Group>

					{ mode === "range" ? (
						<Flex alignItems="flex-start" gap={ 4 }>
							<Field.Root required>
								<Field.Label>Start date</Field.Label>
								<Day_Picker
									on_change={ set_start }
									value={ start }
								/>
							</Field.Root>
							<Field.Root
								error={ end_before_start
									? "The end date falls before the start date."
									: undefined }
								required
							>
								<Field.Label>End date</Field.Label>
								<Day_Picker
									min={ start }
									on_change={ set_end }
									value={ end }
								/>
								<Field.Error />
							</Field.Root>
						</Flex>
					) : (
						<Field.Root>
							<Field.Label>Entries</Field.Label>
							<SingleSelect
								onChange={ ( value ) =>
									set_preset( String( value ) ) }
								value={ preset }
							>
								{ description.presets.map( ( count ) => (
									<SingleSelectOption
										key={ count }
										value={ `latest:${count}` }
									>
										Latest { count }
									</SingleSelectOption>
								) ) }
								{ description.periods.map( ( period_days ) => (
									<SingleSelectOption
										key={ period_days.period }
										value={ `period:${period_days.period}` }
									>
										{ label_of( period_days ) }
									</SingleSelectOption>
								) ) }
							</SingleSelect>
						</Field.Root>
					) }

					{ description.draft_and_publish && (
						<Field.Root hint={ STATUS_HINTS[status] }>
							<Field.Label>Status</Field.Label>
							<Radio.Group
								aria-label="Status"
								onValueChange={ ( value ) =>
									set_status( value as Status ) }
								value={ status }
							>
								<Radio.Item value="published">
									Published
								</Radio.Item>
								<Radio.Item value="draft">Draft</Radio.Item>
								<Radio.Item value="all">All</Radio.Item>
							</Radio.Group>
							<Field.Hint />
						</Field.Root>
					) }

					<Flex alignItems="stretch" direction="column" gap={ 2 }>
						<Typography variant="sigma">Fields</Typography>
						{ description.fields.map( ( field ) => (
							<Checkbox
								checked={ chosen.has( field.name ) }
								key={ field.name }
								onCheckedChange={ ( checked ) =>
									toggle(
										field.name,
										checked === true,
									) }
							>
								{ field.label }
							</Checkbox>
						) ) }
					</Flex>

					<Typography textColor="neutral600" variant="pi">
						Dates are read in the { description.timezone }{" "}
						timezone.
					</Typography>

					{ message && (
						<Typography textColor="neutral800" variant="omega">
							{ message }
						</Typography>
					) }
				</Flex>
			</Modal.Body>
			<Modal.Footer>
				<Modal.Close>
					<Button variant="tertiary">Close</Button>
				</Modal.Close>
				<Button
					disabled={ !can_export }
					loading={ busy }
					onClick={ start_export }
				>
					Export
				</Button>
			</Modal.Footer>
		</Modal.Content>
	)
}

const STATUS_HINTS: Record<Status, string> = {
	all: "Every entry once, as its draft, with a Status column.",
	draft: "Entries that have never been published.",
	published: "The published version of each published entry.",
}

/**
 |
 | A design-system date picker that holds a day as `YYYY-MM-DD`. The day it
 | shows is the day it holds, whatever the browser's timezone.
 |
 | The design-system picker reads the day of its `value` and `minDate` in
 | UTC, but hands `onChange` the first moment of the picked day in the
 | browser's timezone. So a day goes in as UTC midnight, and comes out
 | through the browser's calendar.
 |
 */
function Day_Picker (
	{ value, min, on_change }: {
		value?: string
		min?: string
		on_change: ( day: string | undefined ) => void
	},
) {
	return (
		<DatePicker
			// Writes and reads days as DD/MM/YYYY, the order the period labels
			// use.
			locale="en-GB"
			minDate={ min === undefined ? undefined : utc_midnight_of( min ) }
			onChange={ ( date ) =>
				on_change( date === undefined ? undefined : local_day_of( date ) ) }
			onClear={ () => on_change( undefined ) }
			value={ value === undefined ? undefined : utc_midnight_of( value ) }
		/>
	)
}

function utc_midnight_of ( day: string ) {
	const [ year, month, date ] = day.split( "-" ).map( Number )

	return new Date( Date.UTC( year, month - 1, date ) )
}

function local_day_of ( date: Date ) {
	return [
		String( date.getFullYear() ),
		String( date.getMonth() + 1 ).padStart( 2, "0" ),
		String( date.getDate() ).padStart( 2, "0" ),
	].join( "-" )
}

/**
 |
 | A calendar period's name, followed by the days it covers in the words that
 | suit its length: "Today (24/09)", "This week (21/09 to 24/09)",
 | "Last month (August 2026)", "Last year (2025)".
 |
 */
function label_of ( { period, start, end }: Period_Days ) {
	const { name, span } = PERIODS[period]
	const [ year, month ] = start.split( "-" )

	switch ( span ) {
		case "year":
			return `${name} (${year})`
		case "month":
			return `${name} (${MONTH_NAMES[Number( month ) - 1]} ${year})`
		case "day":
			return `${name} (${day_and_month( start )})`
		case "week":
			return start === end
				? `${name} (${day_and_month( start )})`
				: `${name} (${day_and_month( start )} to ${
					day_and_month( end )
				})`
	}
}

const PERIODS: Record<
	Period,
	{ name: string; span: "day" | "week" | "month" | "year" }
> = {
	last_month: { name: "Last month", span: "month" },
	last_week: { name: "Last week", span: "week" },
	last_year: { name: "Last year", span: "year" },
	this_month: { name: "This month", span: "month" },
	this_week: { name: "This week", span: "week" },
	this_year: { name: "This year", span: "year" },
	today: { name: "Today", span: "day" },
	yesterday: { name: "Yesterday", span: "day" },
}

/** `2026-09-24` as `24/09`. */
function day_and_month ( day: string ) {
	const [ , month, date ] = day.split( "-" )

	return `${date}/${month}`
}

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
]

/**
 |
 | Turns a picker value, such as `latest:50`, into a Request ticket selection.
 | A calendar period carries the day its label was worked out from, so that
 | the export reads the days the label shows, even after midnight.
 |
 */
function selection_of ( preset: string, today: string ) {
	const [ kind, value ] = preset.split( ":" )

	return kind === "latest"
		? { count: Number( value ), kind: "latest" }
		: { as_of: today, kind: "period", period: value }
}

/**
 |
 | Hands the download to the browser through a plain link, so that the file
 | streams to disk rather than into the page's memory. The link cannot carry
 | the admin's login header, so it carries the ticket instead.
 |
 | The `download` attribute keeps a refused link from replacing the admin
 | panel with an error page. The browser shows a failed download instead.
 |
 */
function download ( ticket: string, file_name: string ) {
	const backend = ( window as any ).strapi?.backendURL ?? ""
	const link = document.createElement( "a" )
	link.href = `${backend}/export-entries/download?ticket=${
		encodeURIComponent( ticket )
	}`
	link.download = file_name
	link.click()
}

/**
 |
 | The ticked fields, remembered per content-type in local storage.
 |
 | What is stored is the fields the admin unticked. So a field that has
 | disappeared since drops out when the list is read back, and a field added
 | since starts ticked.
 |
 */
function use_remembered_fields ( uid: string, description: Description ) {
	const key = `export-entries:unticked:${uid}`
	const names = description.fields.map( ( field ) => field.name )

	const [ chosen, set_chosen ] = useState<Set<string>>( () => {
		const unticked = read_list( key )

		return new Set( names.filter( ( name ) => !unticked.includes( name ) ) )
	} )

	const remember = ( next: Set<string> ) => {
		set_chosen( next )
		window.localStorage.setItem(
			key,
			JSON.stringify( names.filter( ( name ) => !next.has( name ) ) ),
		)
	}

	return [ chosen, remember ] as const
}

function read_list ( key: string ): string[] {
	try {
		const value = JSON.parse( window.localStorage.getItem( key ) ?? "[]" )

		return Array.isArray( value ) ? value : []
	} catch {
		return []
	}
}
