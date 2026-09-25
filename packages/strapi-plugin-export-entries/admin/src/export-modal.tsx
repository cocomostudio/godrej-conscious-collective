
import {
	Button,
	Checkbox,
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
}

type Ticket_Answer =
	| { outcome: "no_entries" }
	| { outcome: "ticket"; ticket: string; count: number; file_name: string }

const PERIODS = [
	[ "today", "Today" ],
	[ "yesterday", "Yesterday" ],
	[ "this_week", "This week" ],
	[ "last_week", "Last week" ],
	[ "this_month", "This month" ],
	[ "last_month", "Last month" ],
	[ "this_year", "This year" ],
	[ "last_year", "Last year" ],
] as const

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
			: `period:${PERIODS[0][0]}`,
	)
	const [ chosen, set_chosen ] = use_remembered_fields( uid, description )
	const [ message, set_message ] = useState<string | null>( null )
	const [ busy, set_busy ] = useState( false )

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
					selection: selection_of( preset ),
					uid,
				},
			)

			if ( data.data.outcome === "no_entries" ) {
				set_message( "No entries match." )
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
					<Radio.Group value="preset" aria-label="Which entries">
						<Radio.Item value="preset">Preset</Radio.Item>
						<Radio.Item disabled value="range">
							Custom date range
						</Radio.Item>
					</Radio.Group>

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
							{ PERIODS.map( ( [ period, label ] ) => (
								<SingleSelectOption
									key={ period }
									value={ `period:${period}` }
								>
									{ label }
								</SingleSelectOption>
							) ) }
						</SingleSelect>
					</Field.Root>

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
				<Button loading={ busy } onClick={ start_export }>
					Export
				</Button>
			</Modal.Footer>
		</Modal.Content>
	)
}

/** Turns a picker value, such as `latest:50`, into a Request ticket selection. */
function selection_of ( preset: string ) {
	const [ kind, value ] = preset.split( ":" )

	return kind === "latest"
		? { count: Number( value ), kind: "latest" }
		: { kind: "period", period: value }
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
