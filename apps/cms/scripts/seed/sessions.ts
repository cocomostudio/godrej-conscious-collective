
/**
 |
 | Sessions.
 |
 | One programme item each, hung off an event. Every branch a session page can
 | take has a row here, because the seed is what a developer looks at and every
 | one of these is invisible in a test that does not know to ask:
 |
 |   • an **all-day** session, which reads "All day" and shows no times;
 |   • a session that is **free** and still carries a booking link, because a
 |     free session can need one for capacity;
 |   • a session with **no price at all**, which shows none;
 |   • a session running on **several days**, so a visitor can pick one;
 |   • a session belonging to the event that is **not** main, which wears its
 |     own colours under the main event's chrome; and
 |   • a session created with **no event named**, which the middleware fills
 |     with the main one.
 |
 | `session_date_first` and `session_date_last` are never written here. A
 | middleware derives both from the instances, and a second copy of that rule in
 | the seed could disagree with the first.
 |
 */

import type { Seeded_Contributors } from "./contributors.ts"
import type { Seeded_Events } from "./events.ts"
import { heading_component, link, section } from "./lib/components.ts"
import { session_list } from "./lib/listings.ts"
import { cover_for, COVERS_BY_NAME } from "./lib/media.ts"
import { sample_content_templates } from "./lib/sample-content.ts"
import { create_entry } from "./lib/strapi.ts"
import type { Strapi } from "./lib/strapi.ts"
import type { Seeded_Page_Shells } from "./page-shells.ts"
import { PROGRAMME } from "./programme.ts"
export async function write_sessions (
	strapi: Strapi,
	page_shells: Seeded_Page_Shells,
	events: Seeded_Events,
	contributors: Seeded_Contributors,
) {
	const shell = page_shells.primary.documentId
	const main = events.main.documentId

	// A running counter so the round-robin template is dealt in creation
	// order. Every session that follows takes the next slot in the ring.
	let template_position = 0

	const next_template = () => {
		const region = sample_content_templates[
			template_position % sample_content_templates.length
		]()
		template_position += 1
		return region
	}

	const living_with_the_land = await create_session( strapi, {
		all_day_event: true,
		category: "Showcase",
		checkout_url: "https://example.com/cc/living-with-the-land",
		contributors: [
			contributors.debasmita.documentId,
			contributors.arthur.documentId,
		],
		cover: COVERS_BY_NAME.living_with_the_land,
		event: main,
		instances: instances_daily(
			"2025-12-11",
			"2025-12-13",
			"09:00",
			"22:00",
		),
		main_region: next_template(),
		name: "Living with the Land",
		page_shell: shell,
		price: 1599,
		standfirst:
			"A two-part showcase bringing together the Sustaina fellows, whose "
			+ "work engages with climate impact, cultural continuity and "
			+ "ecological resilience.",
		venue: link( "Outdoor Pergola", "https://example.com/maps/pergola" ),
	} )

	// Free, and still carrying a booking link: the two are independent, because
	// a free session can need one for capacity.
	const block_printing = await create_session( strapi, {
		age_group: "Children",
		category: "Workshop",
		checkout_url: "https://example.com/cc/block-printing",
		contributors: [ contributors.priya.documentId ],
		cover: COVERS_BY_NAME.block_printing,
		event: main,
		instances: [
			instance( "2025-12-12", "10:00", "12:30" ),
			instance( "2025-12-12", "14:00", "16:30" ),
		],
		main_region: next_template(),
		name: "Block Printing with Native Cotton",
		page_shell: shell,
		price: 0,
		standfirst: "Hands on a block, ink and a length of khadi.",
		venue: link( "Studio Two", "https://example.com/maps/studio-two" ),
	} )

	// No price at all, so the website shows none — which is not the same as
	// showing "Free".
	const designing_for_heat = await create_session( strapi, {
		category: "Conversation",
		contributors: [ contributors.rahul.documentId ],
		cover: COVERS_BY_NAME.designing_for_heat,
		event: main,
		instances: [ instance( "2025-12-13", "17:00", "18:30" ) ],
		main_region: next_template(),
		name: "Designing for Heat",
		page_shell: shell,
		standfirst: "A panel on what a heat-resilient city asks of design.",
		venue: link(
			"The Conversation Stage",
			"https://example.com/maps/stage",
		),
	} )

	await create_session( strapi, {
		age_group: "Adults",
		category: "Experience",
		cover: COVERS_BY_NAME.cooling_pergola,
		event: main,
		instances: instances_daily(
			"2025-12-11",
			"2025-12-13",
			"11:00",
			"19:00",
		),
		main_region: next_template(),
		name: "The Cooling Pergola",
		page_shell: shell,
		price: 250,
		standfirst: "Twelve metres of woven bamboo, and the air beneath it.",
		venue: link( "Outdoor Pergola", "https://example.com/maps/pergola" ),
	} )

	// The event that is not main: 2027's colours under 2025's chrome.
	await create_session( strapi, {
		category: "Conversation",
		contributors: [ contributors.kaveri.documentId ],
		cover: COVERS_BY_NAME.notes_for_2027,
		event: events.other.documentId,
		instances: [ instance( "2027-12-03", "16:00", "17:00" ) ],
		main_region: next_template(),
		name: "Notes for 2027",
		page_shell: shell,
		standfirst: "The first thing announced for what comes next.",
	} )

	// No event named. The middleware fills it with the main one on creation,
	// which is the whole of user story 31 in one row.
	await create_session( strapi, {
		category: "Workshop",
		cover: COVERS_BY_NAME.repairing_what_you_own,
		instances: [ instance( "2025-12-13", "10:00", "11:30" ) ],
		main_region: [
			...next_template(),
			// The one **curated** listing in the seed: three sessions an
			// editor picked, in an order they chose, rather than whatever the
			// event happens to hold. It is the "you might also like" strip the
			// design puts at the foot of a session.
			section( "You might also like", {
				blocks: [
					session_list( [
						designing_for_heat,
						living_with_the_land,
						block_printing,
					] ),
				],
				heading: heading_component( "You might also like", "h3" ),
				horizontal_rule: true,
				register_with_toc: false,
			} ),
		],
		name: "Repairing What You Own",
		page_shell: shell,
		price: 400,
		standfirst: "Bring one broken thing.",
	} )

	// Never published, so the published path provably does not serve it and
	// draft preview has a session to preview. The contributor attached here
	// is the one whose events list must stay empty: the middleware derives
	// events from **published** sessions only.
	await create_session( strapi, {
		category: "Showcase",
		contributors: [ contributors.iris.documentId ],
		cover: COVERS_BY_NAME.unannounced,
		event: main,
		instances: [ instance( "2025-12-13", "12:00", "13:00" ) ],
		main_region: next_template(),
		name: "Unannounced Showcase",
		page_shell: shell,
		published: false,
	} )

	// A second unpublished session, in the event that is **not** main, so that
	// draft preview is observable *inside a listing* rather than only on a page
	// of its own. 2027 holds two published Showcases; asking for its page as a
	// draft is what makes this one the third.
	await create_session( strapi, {
		category: "Showcase",
		cover: COVERS_BY_NAME.still_being_written,
		event: events.other.documentId,
		instances: [ instance( "2027-12-03", "10:00", "18:00" ) ],
		main_region: next_template(),
		name: "Still Being Written",
		page_shell: shell,
		published: false,
		standfirst: "Announced when it is ready.",
	} )

	// The rest of the programme. Thin, and deliberately so: what these are for
	// is filling the category listings and the schedule page, which are tickets
	// 08 and 09.
	//
	// One cover counter per category, so each category deals its own pool from
	// the top rather than all four sharing a position nobody can predict.
	const covers_dealt: Record<string, number> = {}

	for ( const filler of PROGRAMME ) {
		const position = covers_dealt[filler.category] ?? 0
		covers_dealt[filler.category] = position + 1

		await create_session( strapi, {
			age_group: filler.age_group,
			category: filler.category,
			checkout_url: filler.checkout_url,
			cover: cover_for( filler.category, position ),
			event: filler.year === 2027 ? events.other.documentId : main,
			instances: [
				instance( filler.day, filler.from, filler.to ),
			],
			main_region: next_template(),
			name: filler.name,
			page_shell: shell,
			price: filler.price,
			standfirst: filler.standfirst,
			venue: link( filler.venue, "https://example.com/maps/plant-13" ),
		} )
	}
}

/**
 |
 | A session, published unless told otherwise.
 |
 | The rule itself lives in `create_entry`, which pages carry too; this names
 | the content type once so that the twenty calls above do not each have to.
 |
 */
function create_session ( strapi: Strapi, data: Record<string, any> ) {
	return create_entry( strapi, "api::session.session", data )
}

/**
 |
 | One instance, as the two datetimes the schema holds.
 |
 | Written with the event's own offset spelled out rather than as a bare
 | local time, because a seed that means half past ten in Mumbai must not mean
 | half past ten wherever the developer running it happens to be.
 |
 */
function instance ( day: string, from: string, to: string ) {
	return {
		time_end: `${day}T${to}:00.000+05:30`,
		time_start: `${day}T${from}:00.000+05:30`,
	}
}

/** The same hours on every day of a range, one instance each. */
function instances_daily (
	first: string,
	last: string,
	from: string,
	to: string,
) {
	const days: string[] = []

	for (
		let day = new Date( `${first}T00:00:00.000Z` );
		day <= new Date( `${last}T00:00:00.000Z` );
		day.setUTCDate( day.getUTCDate() + 1 )
	) {
		days.push( day.toISOString().slice( 0, 10 ) )
	}

	return days.map( ( day ) => instance( day, from, to ) )
}
