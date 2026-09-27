import type { Core } from "@strapi/strapi"

const READ = "plugin::content-manager.explorer.read"

/** A database `where`, as `strapi.db.query()` takes it. */
export type Where = Record<string, unknown>

/**
 |
 | What one admin's roles let that admin read, as the content manager's
 | permission checker answers it. The export reads through it, so that an
 | export never shows more than the list page and the edit view do.
 |
 */
export type Access = {
	/** Whether the admin can read the content-type at all. */
	can_read: ( uid: string ) => boolean
	/** Whether the admin can read the field on at least some entries. */
	can_read_field: ( uid: string, name: string ) => boolean
	/**
	 |
	 | The entries the admin can read. A role limited to some entries, such as
	 | "only entries I created", narrows it.
	 |
	 */
	readable_rows: ( uid: string ) => Promise<Where>
	/**
	 |
	 | The entries on which each field can be read, for each field that can be
	 | read on fewer entries than `readable_rows` answers. That happens when
	 | the admin's roles grant a field only under a condition, while granting
	 | other fields without it.
	 |
	 */
	field_scopes: (
		uid: string,
		names: string[],
	) => Promise<Map<string, Where>>
}

type Checker = {
	can: { read: ( entity?: unknown, field?: string ) => boolean }
	cannot: { read: ( entity?: unknown, field?: string ) => boolean }
	sanitizedQuery: {
		read: ( query: object ) => Promise<{ filters?: object }>
	}
}

type Permission = {
	action: string
	subject: string | null
	properties?: { fields?: string[] }
}

/**
 |
 | The access of an admin whose roles produced `ability`. The admin must be
 | the one the ability was generated for, because conditions such as "only
 | entries I created" are read from the admin.
 |
 */
export function access_of (
	strapi: Core.Strapi,
	admin: { id: number },
	ability: unknown,
): Access {
	const permission_service = strapi.service( "admin::permission" )

	const checker_of = ( uid: string, of_ability = ability ): Checker =>
		strapi.plugin( "content-manager" )
			.service( "permission-checker" )
			.create( { model: uid, userAbility: of_ability } )

	const rows_of = async (
		uid: string,
		checker: Checker,
	): Promise<Where> => {
		const { filters } = await checker.sanitizedQuery.read( {} )

		if ( !filters ) {
			return {}
		}

		// The checker writes its filters for the document service. The
		// document service turns them into a `where` this same way.
		return strapi.get( "query-params" ).transform( uid, { filters } ).where
	}

	return {
		can_read: ( uid ) => !checker_of( uid ).cannot.read(),

		can_read_field: ( uid, name ) =>
			checker_of( uid ).can.read( null, name ),

		readable_rows: ( uid ) => rows_of( uid, checker_of( uid ) ),

		async field_scopes ( uid, names ) {
			const permissions: Permission[] = await permission_service
				.findUserPermissions( admin )
			const readable = JSON.stringify(
				await rows_of( uid, checker_of( uid ) ),
			)
			const scopes = new Map<string, Where>()

			for ( const name of names ) {
				// Only the permissions that grant this field, so that the
				// checker answers the entries this one field can be read on.
				const granting = permissions.filter( ( permission ) =>
					permission.action === READ
					&& permission.subject === uid
					&& (
						!permission.properties?.fields
						|| permission.properties.fields.includes( name )
					)
				)
				const field_ability = await permission_service.engine
					.generateTokenAbility( granting, admin )
				const where = await rows_of(
					uid,
					checker_of( uid, field_ability ),
				)

				// Equal filters come out of the checker in the same order,
				// so comparing their text is enough to find the same rows.
				if ( JSON.stringify( where ) !== readable ) {
					scopes.set( name, where )
				}
			}

			return scopes
		},
	}
}
