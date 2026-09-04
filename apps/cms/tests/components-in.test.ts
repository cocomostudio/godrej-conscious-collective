
/**
 |
 | Finding one component inside a write, at every depth the catalogue puts it.
 |
 | The schemas here are miniatures of the real ones, and they are written out
 | rather than read from `src/components` on purpose: this is a test of the
 | walk, and borrowing the real catalogue would make it a test of the walk and
 | of whatever the catalogue happened to look like that week.
 |
 | The case that earns the file is `map` on a map-and-content. It is a single
 | component attribute, so it arrives as a bare object carrying no
 | `__component` — invisible to anything hunting for markers, and findable only
 | by reading the schema on the way down.
 |
 */

import { describe, expect, it } from "vitest"

import type { Runtime_Schema } from "../src/this/document-middlewares/components-in"

import { components_in } from "../src/this/document-middlewares/components-in"

const MAP = "media.google-map-v1"

const SCHEMAS: Record<string, Runtime_Schema> = {
	"api::page.page": {
		attributes: {
			main_region: {
				components: [ "container.section-v1", MAP ],
				type: "dynamiczone",
			},
			title: { type: "string" },
		},
	},
	"container.map-and-content-v1": {
		attributes: {
			content: {
				components: [ "text.plain-string-v1" ],
				type: "dynamiczone",
			},
			map: { component: MAP, type: "component" },
		},
	},
	"container.section-v1": {
		attributes: {
			content: {
				components: [ "container.map-and-content-v1", MAP ],
				type: "dynamiczone",
			},
			gallery: {
				component: "media.gallery-v1",
				repeatable: true,
				type: "component",
			},
		},
	},
	"media.gallery-v1": {
		attributes: { map: { component: MAP, type: "component" } },
	},
	[MAP]: {
		attributes: { place_url: { type: "string" } },
	},
	"text.plain-string-v1": {
		attributes: { text: { type: "string" } },
	},
}

const schema_of = ( uid: string ) => SCHEMAS[uid]

function maps_in ( data: unknown ) {
	return components_in( MAP, "api::page.page", data, schema_of )
}

describe("finding a component in a write", () => {
	it("finds one sitting directly in a dynamic zone", () => {
		const map = { __component: MAP, place_url: "one" }

		expect( maps_in( { main_region: [ map ] } ) ).toEqual( [ map ] )
	})

	it("finds one behind a single component attribute, which carries no marker", () => {
		const map = { place_url: "one" }
		const data = {
			main_region: [
				{ __component: "container.map-and-content-v1", map },
			],
		}

		expect( maps_in( data ) ).toEqual( [ map ] )
	})

	it("finds one three levels down, through a nested dynamic zone", () => {
		const map = { place_url: "one" }
		const data = {
			main_region: [
				{
					__component: "container.section-v1",
					content: [
						{
							__component: "container.map-and-content-v1",
							map,
						},
					],
				},
			],
		}

		expect( maps_in( data ) ).toEqual( [ map ] )
	})

	it("finds one inside a repeatable component", () => {
		const map = { place_url: "one" }
		const data = {
			main_region: [
				{
					__component: "container.section-v1",
					gallery: [ { map: null }, { map } ],
				},
			],
		}

		expect( maps_in( data ) ).toEqual( [ map ] )
	})

	it("finds every one of them, in the order they were written", () => {
		const first = { place_url: "first" }
		const second = { __component: MAP, place_url: "second" }
		const data = {
			main_region: [
				{ __component: "container.map-and-content-v1", map: first },
				second,
			],
		}

		expect( maps_in( data ).map( ( map ) => map.place_url ) ).toEqual( [
			"first",
			"second",
		] )
	})

	// The reason for the walk: amending a write means writing into the very
	// object the document service is about to hand the database.
	it("hands back the objects themselves, not copies of them", () => {
		const map = { place_url: "one" }
		const data = { main_region: [ { __component: MAP, ...map } ] }

		const [ found ] = maps_in( data )
		found.latitude = 19.09

		expect( ( data.main_region[0] as Record<string, unknown> ).latitude )
			.toBe( 19.09 )
	})
})

describe("what it walks past", () => {
	it("finds nothing in a write that holds none", () => {
		const data = {
			main_region: [
				{
					__component: "container.section-v1",
					content: [
						{
							__component: "text.plain-string-v1",
							text: "hello",
						},
					],
				},
			],
			title: "About",
		}

		expect( maps_in( data ) ).toEqual( [] )
	})

	it("finds nothing when the write does not mention the region at all", () => {
		expect( maps_in( { title: "About" } ) ).toEqual( [] )
	})

	it("is untroubled by a null component or an empty zone", () => {
		const data = {
			main_region: [
				{ __component: "container.map-and-content-v1", map: null },
				{ __component: "container.section-v1", content: [] },
			],
		}

		expect( maps_in( data ) ).toEqual( [] )
	})

	it("is untroubled by a component the schema has never heard of", () => {
		const data = {
			main_region: [ { __component: "media.invented-v1", map: {} } ],
		}

		expect( maps_in( data ) ).toEqual( [] )
	})

	it("finds nothing for a content type it does not know", () => {
		expect( components_in( MAP, "api::nothing.nothing", {}, schema_of ) )
			.toEqual( [] )
	})
})
