
/**
 |
 | The shape of the catalogue as a whole, read off the schema files.
 |
 | Not a mirror of any one schema — the populate tests cover what a component
 | holds, and restating a file's fields against itself proves nothing. These are
 | the invariants that live **between** files and that no single file can be
 | read to check:
 |
 |   • the `-v1` convention, in all three places it applies;
 |   • that the section list has not silently fallen behind the catalogue, which
 |     would leave a component an editor can never place;
 |   • that the inner list is the same four everywhere it is pointed at, and that
 |     the one component pointing somewhere else points at the archive entry
 |     list; and
 |   • the depth cap, which is the one that matters. The populate object mirrors
 |     the schema graph by hand with no recursion, so a component that can
 |     contain itself makes a finite populate object impossible — and the
 |     symptom is not an error but content vanishing below whatever depth the
 |     object reaches.
 |
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
	describe,
	expect,
	it,
} from "vitest"

const COMPONENTS = path.join(
	fileURLToPath( new URL( ".", import.meta.url ) ),
	"..",
	"src",
	"components",
)

const CONTENT_TYPES = path.join(
	fileURLToPath( new URL( ".", import.meta.url ) ),
	"..",
	"src",
	"api",
)

const SECTION = "container.section-v1"

const ARCHIVE_ENTRY = "list.archive-entry-v1"

const INNER_LIST = [
	"navigation.link-v1",
	"text.heading-v1",
	"text.plain-string-v1",
	"text.wysiwyg-v1",
]

/**
 |
 | The **archive entry list** — the one region in the catalogue that is neither
 | the section list nor the inner list.
 |
 | Every member of it is something that can stand alone as a slide, because on a
 | large, tall screen each one becomes one. That is why a bare link and a lone
 | heading are absent from it and present in the inner list.
 |
 */
const ARCHIVE_ENTRY_LIST = [
	"container.image-and-content-v1",
	"media.gallery-v1",
	"media.responsive-image-v1",
	"text.quote-v1",
	"text.wysiwyg-v1",
]

/**
 |
 | The components the section list deliberately leaves out, and why. Anything
 | else missing from that list is a component an editor can never reach.
 |
 */
const NOT_IN_THE_SECTION_LIST = new Set( [
	// A section inside a section would be a fourth zone and a cycle.
	"container.section-v1",
	// Site chrome, on the page shell. Never page content.
	"code.html-document-hooks-v1",
	"code.script-v1",
	// Members of a repeatable list, reached through the list that holds them.
	"list.archive-entry-v1",
	"list.profile-v1",
	"list.sponsor-v1",
	// A repeatable component on a content type rather than a page component.
	// A session's instances are data about the session, never something an
	// editor places in a region.
	"session.session-instance-v1",
] )

type Component = {
	uid: string
	file: string
	schema: any
}

const components = read_components()

function read_components (): Component[] {
	return fs.readdirSync( COMPONENTS, { withFileTypes: true } )
		.filter( ( entry ) => entry.isDirectory() )
		.flatMap( ( category ) =>
			fs.readdirSync( path.join( COMPONENTS, category.name ) )
				.filter( ( file ) => file.endsWith( ".json" ) )
				.map( ( file ) => ( {
					file: `${category.name}/${file}`,
					schema: JSON.parse(
						fs.readFileSync(
							path.join( COMPONENTS, category.name, file ),
							"utf8",
						),
					),
					uid: `${category.name}.${
						file.replace( /\.json$/, "" )
					}`,
				} ) )
		)
}

function zones ( schema: any ): string[][] {
	return Object.values( schema?.attributes ?? {} )
		.filter( ( attribute: any ) => attribute?.type === "dynamiczone" )
		.map( ( attribute: any ) => attribute.components as string[] )
}

/**
 |
 | The components a schema names through a plain `component` attribute, whether
 | repeatable or not.
 |
 | **A component attribute is not a region**, and the walk below counts regions
 | — but it still has to *follow* one, because a component reached that way can
 | carry a region of its own. The archive timeline listing is the first that
 | does: its entries are a repeatable component and each entry holds a zone, so
 | a walk that only followed zones would stop at the listing and report the
 | tree one level shallower than it is.
 |
 */
function held_components ( schema: any ): string[] {
	return Object.values( schema?.attributes ?? {} )
		.filter( ( attribute: any ) => attribute?.type === "component" )
		.map( ( attribute: any ) => attribute.component as string )
}

describe("every component in the catalogue", () => {
	it("exists — the file, the uid and the collection name all carry -v1", () => {
		expect( components.length ).toBeGreaterThan( 0 )

		const wrong = components.filter( ( component ) =>
			!component.file.endsWith( "-v1.json" )
			|| !component.uid.endsWith( "-v1" )
			|| !String( component.schema.collectionName ).endsWith( "_v1" )
		)

		expect( wrong.map( ( component ) => component.file ) ).toEqual( [] )
	})

	it("carries a metadata block", () => {
		const without = components.filter( ( component ) =>
			!component.schema.__?.metadatas || !component.schema.__?.layouts
		)

		expect( without.map( ( component ) => component.file ) ).toEqual( [] )
	})

	it("names its one region `content`", () => {
		// A component with a single region names it `content`, and the
		// renderer recurses into it with no rename step. A component with more
		// than one declares its names — the HTML document hooks is the one.
		const misnamed = components
			.filter( ( component ) => zones( component.schema ).length === 1 )
			.filter( ( component ) =>
				component.schema.attributes.content?.type !== "dynamiczone"
			)

		expect( misnamed.map( ( component ) => component.uid ) ).toEqual( [] )
	})
})

describe("the section list", () => {
	const section = components.find( ( component ) =>
		component.uid === SECTION
	)!
	const section_list = section.schema.attributes.content.components

	it("holds every leaf and every composite component", () => {
		const missing = components
			.map( ( component ) => component.uid )
			.filter( ( uid ) => !NOT_IN_THE_SECTION_LIST.has( uid ) )
			.filter( ( uid ) => !section_list.includes( uid ) )

		expect( missing ).toEqual( [] )
	})

	it("holds nothing the catalogue does not have", () => {
		const known = new Set(
			components.map( ( component ) => component.uid ),
		)

		expect( section_list.filter( ( uid: string ) => !known.has( uid ) ) )
			.toEqual( [] )
	})
})

describe("the inner list", () => {
	it("is exactly four, and every composite points its region at it", () => {
		// The archive entry is the one component with a region that is neither
		// the section nor a composite: it is a member of a repeatable list, and
		// its region is the archive entry list. It has its own assertion below.
		const composites = components.filter( ( component ) =>
			component.uid !== SECTION
			&& component.uid !== ARCHIVE_ENTRY
			&& zones( component.schema ).length === 1
		)

		expect( composites.length ).toBeGreaterThan( 0 )

		for ( const composite of composites ) {
			expect( {
				list: [ ...composite.schema.attributes.content.components ]
					.sort(),
				uid: composite.uid,
			} ).toEqual( { list: INNER_LIST, uid: composite.uid } )
		}
	})

	it("holds no component that carries a region of its own", () => {
		const carrying = INNER_LIST.filter( ( uid ) => {
			const component = components.find( ( candidate ) =>
				candidate.uid === uid
			)!

			return zones( component.schema ).length > 0
		} )

		expect( carrying ).toEqual( [] )
	})
})

describe("the archive entry list", () => {
	const entry = components.find( ( component ) =>
		component.uid === ARCHIVE_ENTRY
	)!

	it("is what the archive entry points its region at", () => {
		expect( [ ...entry.schema.attributes.content.components ].sort() )
			.toEqual( ARCHIVE_ENTRY_LIST )
	})

	it("holds one component that carries a region, and it is a composite", () => {
		// The list is one level deeper than the inner list on purpose — see
		// the fragment in src/this/components/list/archive-entry-v1.ts. What
		// keeps it finite is that whatever it holds points *its* region at the
		// inner list, whose members carry no region at all.
		const carrying = ARCHIVE_ENTRY_LIST.filter( ( uid ) => {
			const component = components.find( ( candidate ) =>
				candidate.uid === uid
			)!

			return zones( component.schema ).length > 0
		} )

		expect( carrying ).toEqual( [ "container.image-and-content-v1" ] )

		for ( const uid of carrying ) {
			const component = components.find( ( candidate ) =>
				candidate.uid === uid
			)!

			expect( [ ...component.schema.attributes.content.components ]
				.sort() ).toEqual( INNER_LIST )
		}
	})
})

describe("depth", () => {
	/**
	 |
	 | How many dynamic zones deep a component goes, counting its own.
	 |
	 | Two kinds of hop, and only one of them costs a level. Crossing a **zone**
	 | is a level, because that is what is being counted. Crossing a plain
	 | **component attribute** is not — but it is still followed, because what
	 | it reaches may carry a zone. The archive entry is reached that way.
	 |
	 | The walk carries the path it took, so a cycle is reported as the cycle it
	 | is rather than as a stack overflow — a component that can contain itself
	 | is precisely the failure this cap exists to prevent, and following both
	 | kinds of hop is what makes that check cover the whole graph rather than
	 | the zones alone.
	 |
	 */
	function zone_depth ( uid: string, seen: string[] = [] ): number {
		if ( seen.includes( uid ) ) {
			throw new Error(
				`"${uid}" can contain itself: ${
					[ ...seen, uid ].join( " → " )
				}`,
			)
		}

		const component = components.find( ( candidate ) =>
			candidate.uid === uid
		)

		if ( !component ) {
			throw new Error(
				`"${uid}" is named by a zone but has no schema.`,
			)
		}

		const path = [ ...seen, uid ]
		const lists = zones( component.schema )

		const through_a_zone = lists.length === 0 ? 0 : 1 + Math.max(
			...lists.flat().map( ( member ) => zone_depth( member, path ) ),
			0,
		)

		const alongside = Math.max(
			...held_components( component.schema ).map( ( member ) =>
				zone_depth( member, path )
			),
			0,
		)

		return Math.max( through_a_zone, alongside )
	}

	/**
	 |
	 | **Four, and it was three until the Archive arrived.**
	 |
	 | Three was the number every path reached: an entry's region, a section's,
	 | a composite's, then a leaf. The archive entry adds one, because it is a
	 | region-carrying member of a repeatable list and one of the things it may
	 | hold is itself a composite — entry region, section, archive entry,
	 | image-and-content, leaf.
	 |
	 | The number is not what the cap is for. What it is for is the test below:
	 | the populate object mirrors the schema graph by hand with no recursion, so
	 | a component that can contain itself makes a finite populate object
	 | impossible. Four terminating levels are as finite as three. This
	 | assertion's job is to make the next level cost a deliberate edit here
	 | rather than arriving unremarked.
	 |
	 */
	it("is capped at four dynamic zones from an entry's region", () => {
		const deepest = Math.max(
			...content_type_zones().map( ( members ) =>
				1 + Math.max(
					...members.map( ( member ) => zone_depth( member ) ),
					0,
				)
			),
		)

		expect( deepest ).toBe( 4 )
	})

	it("has no component that can contain itself", () => {
		// The cycle check is inside the walk, so reaching every component
		// without throwing is the assertion.
		expect( () =>
			components.forEach( ( component ) => zone_depth( component.uid ) )
		).not.toThrow()
	})
})

function content_type_zones (): string[][] {
	return fs.readdirSync( CONTENT_TYPES, { withFileTypes: true } )
		.filter( ( entry ) => entry.isDirectory() )
		.flatMap( ( api ) => {
			const directory = path.join(
				CONTENT_TYPES,
				api.name,
				"content-types",
			)

			if ( !fs.existsSync( directory ) ) {
				return []
			}

			return fs.readdirSync( directory ).flatMap( ( name ) => {
				const file = path.join( directory, name, "schema.json" )

				return fs.existsSync( file )
					? zones( JSON.parse( fs.readFileSync( file, "utf8" ) ) )
					: []
			} )
		} )
}
