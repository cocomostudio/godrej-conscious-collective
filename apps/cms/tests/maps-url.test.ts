
/**
 |
 | Reading a pin out of the URL Google Maps puts in an editor's address bar.
 |
 | The distinction the whole component rests on is the first `describe` below:
 | a Maps URL carries **two** coordinate pairs, and they are not the same
 | place. The `@` segment is where the editor's browser window happened to be
 | pointing; the `!3d`/`!4d` fields inside `data=` are the pin itself. In the
 | seed's own URL they are 270 metres apart.
 |
 | No Strapi instance is booted here — the reading is a pure function of a
 | string, which is exactly why it is a separate module from the middlewares
 | that call it.
 |
 */

import { describe, expect, it } from "vitest"

import { read_maps_url } from "../src/this/document-middlewares/maps-url"

/**
 |
 | The seed's own location, and the reason `!3d`/`!4d` wins.
 |
 | `@…,72.9200579` and `!4d72.9226328` differ by 0.0026° of longitude, which at
 | this latitude is about 270 metres — the difference between the pin and the
 | middle of the window the editor was looking at.
 |
 */
const VIKHROLI =
	"https://www.google.com/maps/place/@19.0939921,72.9200579,17z/data=!3m2"
	+ "!4b1!5s0x397878ffde0c8ab3:0x8b5bde3d4ef844a4!4m6!3m5"
	+ "!1s0x3be7c752aef03905:0x95914985cbca39c8!8m2!3d19.0939921!4d72.9226328"
	+ "!16s%2Fg%2F11hhrs35dw"

describe("the pin and the viewport", () => {
	it("takes the pin from data=, not the viewport from @", () => {
		expect( read_maps_url( VIKHROLI ) ).toEqual( {
			coordinates: { latitude: 19.0939921, longitude: 72.9226328 },
			outcome: "read",
		} )
	})

	it("falls back to @ when there is no data= to read", () => {
		expect(
			read_maps_url(
				"https://www.google.com/maps/@19.0939921,72.9200579,17z",
			),
		)
			.toEqual( {
				coordinates: { latitude: 19.0939921, longitude: 72.9200579 },
				outcome: "read",
			} )
	})

	it("reads a place that kept its name in the path", () => {
		const url =
			"https://www.google.com/maps/place/Godrej+One/@19.09,72.92,17z"
			+ "/data=!4m6!3m5!8m2!3d19.0939921!4d72.9226328"

		expect( read_maps_url( url ) ).toEqual( {
			coordinates: { latitude: 19.0939921, longitude: 72.9226328 },
			outcome: "read",
		} )
	})

	it("reads the q= form, which is what a shared coordinate looks like", () => {
		expect(
			read_maps_url(
				"https://www.google.com/maps?q=19.0939921,72.9226328",
			),
		)
			.toEqual( {
				coordinates: { latitude: 19.0939921, longitude: 72.9226328 },
				outcome: "read",
			} )
	})

	it("keeps the sign on a place south and west of the meridian", () => {
		expect(
			read_maps_url(
				"https://www.google.com/maps/@-33.8688,-151.2093,17z",
			),
		)
			.toEqual( {
				coordinates: { latitude: -33.8688, longitude: -151.2093 },
				outcome: "read",
			} )
	})

	it("reads a regional Google domain", () => {
		expect(
			read_maps_url( "https://www.google.co.in/maps/@19.09,72.92,17z" ),
		)
			.toEqual( {
				coordinates: { latitude: 19.09, longitude: 72.92 },
				outcome: "read",
			} )
	})

	it("reads the maps.google.com host the embed itself uses", () => {
		expect( read_maps_url( "https://maps.google.com/maps?q=19.09,72.92" ) )
			.toEqual( {
				coordinates: { latitude: 19.09, longitude: 72.92 },
				outcome: "read",
			} )
	})
})

describe("what it refuses", () => {
	// The one an editor will actually hit: the mobile Share sheet hands out
	// short links, and the coordinates are at the far end of a redirect this
	// server is firewalled out of following.
	it.each( [
		"https://maps.app.goo.gl/AbCdEf123456",
		"https://goo.gl/maps/AbCdEf123456",
	] )( "names a short link as a short link: %s", ( url ) => {
		expect( read_maps_url( url ) ).toEqual( {
			outcome: "short_link",
		} )
	} )

	it("refuses a URL that is not Google Maps at all", () => {
		expect( read_maps_url( "https://example.com/maps/plant-13" ) ).toEqual(
			{
				outcome: "not_a_map",
			},
		)
	})

	it("refuses a Maps URL that names no place", () => {
		expect( read_maps_url( "https://www.google.com/maps/search/coffee" ) )
			.toEqual( { outcome: "no_coordinates" } )
	})

	it("refuses coordinates that are not on the planet", () => {
		expect(
			read_maps_url( "https://www.google.com/maps/@199.0,72.0,17z" ),
		)
			.toEqual( { outcome: "no_coordinates" } )
	})

	it.each( [ "", "   ", "not a url" ] )(
		"refuses what is not a URL: %j",
		( url ) => {
			expect( read_maps_url( url ) ).toEqual( {
				outcome: "not_a_map",
			} )
		},
	)
})
