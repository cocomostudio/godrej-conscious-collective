
import { Button, Modal } from "@strapi/design-system"
import { Download } from "@strapi/icons"
import { useFetchClient } from "@strapi/strapi/admin"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import { type Description, Export_Modal } from "./export-modal"

/**
 |
 | The Export button in the list page's action row.
 |
 | The server decides whether the button shows. Describe answers only for a
 | content-type the plugin is set up for, and only to an admin who can read
 | it. Any other answer leaves the button out.
 |
 | Describe is asked again each time the modal opens, so that the calendar
 | periods show the days they cover on the day the modal is opened.
 |
 */
export function Export_Button () {
	const { slug } = useParams<{ slug: string }>()
	const [ open, set_open ] = useState( false )
	const [ times_opened, set_times_opened ] = useState( 0 )
	const description = use_description( slug, times_opened )

	if ( !slug || !description ) {
		return null
	}

	const open_or_close = ( next: boolean ) => {
		set_open( next )

		if ( next ) {
			set_times_opened( times_opened + 1 )
		}
	}

	return (
		<Modal.Root onOpenChange={ open_or_close } open={ open }>
			<Modal.Trigger>
				<Button startIcon={ <Download /> } variant="tertiary">
					Export
				</Button>
			</Modal.Trigger>
			{ open && (
				<Export_Modal
					description={ description }
					on_started={ () => set_open( false ) }
					uid={ slug }
				/>
			) }
		</Modal.Root>
	)
}

/**
 |
 | Describe's answer for the content-type in `slug`, asked again whenever
 | `times_opened` changes. An answer for an earlier content-type is never
 | shown. The answer on screen stays until a fresh one arrives, and stays when
 | asking again fails, so that a failed refresh never closes an open modal.
 |
 */
function use_description ( slug: string | undefined, times_opened: number ) {
	const { get } = useFetchClient()
	const [ answer, set_answer ] = useState<
		{ slug: string; description: Description | null } | null
	>( null )

	useEffect( () => {
		let current = true

		if ( slug ) {
			get<{ data: Description }>(
				`/export-entries/content-types/${slug}`,
			)
				.then( ( { data } ) =>
					current && set_answer( { description: data.data, slug } )
				)
				.catch( () =>
					current && set_answer( ( previous ) =>
						previous?.slug === slug
							? previous
							: { description: null, slug }
					)
				)
		}

		return () => {
			current = false
		}
	}, [ slug, times_opened ] )

	return answer && answer.slug === slug ? answer.description : null
}
