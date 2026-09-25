
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
 */
export function Export_Button () {
	const { slug } = useParams<{ slug: string }>()
	const description = use_description( slug )

	if ( !slug || !description ) {
		return null
	}

	return (
		<Modal.Root>
			<Modal.Trigger>
				<Button startIcon={ <Download /> } variant="tertiary">
					Export
				</Button>
			</Modal.Trigger>
			<Export_Modal description={ description } />
		</Modal.Root>
	)
}

function use_description ( slug: string | undefined ) {
	const { get } = useFetchClient()
	const [ description, set_description ] = useState<Description | null>(
		null,
	)

	useEffect( () => {
		let current = true
		set_description( null )

		if ( slug ) {
			get<{ data: Description }>(
				`/export-entries/content-types/${slug}`,
			)
				.then( ( { data } ) =>
					current && set_description( data.data )
				)
				.catch( () => current && set_description( null ) )
		}

		return () => {
			current = false
		}
	}, [ slug ] )

	return description
}
