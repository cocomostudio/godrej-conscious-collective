
import {
	Button,
	Checkbox,
	Flex,
	Modal,
	Typography,
} from "@strapi/design-system"
import { useState } from "react"

/** What the server's Describe endpoint answers. */
export type Description = {
	fields: { name: string; label: string }[]
	draft_and_publish: boolean
	timezone: string
	presets: number[]
}

export function Export_Modal ( { description }: { description: Description } ) {
	const [ chosen, set_chosen ] = useState<Set<string>>(
		() => new Set( description.fields.map( ( field ) => field.name ) ),
	)

	const toggle = ( name: string, ticked: boolean ) => {
		const next = new Set( chosen )

		if ( ticked ) {
			next.add( name )
		} else {
			next.delete( name )
		}

		set_chosen( next )
	}

	return (
		<Modal.Content>
			<Modal.Header>
				<Modal.Title>Export entries</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Flex alignItems="stretch" direction="column" gap={ 4 }>
					<Typography variant="sigma">Fields</Typography>
					<Flex alignItems="stretch" direction="column" gap={ 2 }>
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
				</Flex>
			</Modal.Body>
			<Modal.Footer>
				<Modal.Close>
					<Button variant="tertiary">Close</Button>
				</Modal.Close>
			</Modal.Footer>
		</Modal.Content>
	)
}
