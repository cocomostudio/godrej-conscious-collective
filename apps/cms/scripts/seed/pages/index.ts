
/**
 |
 | Pages — the content type the route table is made of.
 |
 | A Page is a title, a shell, a layout and two regions of catalogue
 | components; its URL is derived from its title. The long ones have files of
 | their own beside this; everything written here is either thin, derived
 | from a table, or exists to prove one branch of the arrangement:
 |
 |   • the **Archives** page, whose timeline is the one repeatable component in
 |     the catalogue that holds a region of its own;
 |   • the **category listing** pages, one per session category;
 |   • the **schedule** page, whose one component fills itself;
 |   • a page belonging to the event that is **not** main;
 |   • an **archived** page, on the second page shell; and
 |   • a page that is **never published**.
 |
 | Order matters only in that contributors and events must already exist — see
 | `content.ts`.
 |
 */

import {
	heading,
	heading_component,
	plain_string,
	section,
} from "../lib/components.ts"
import {
	contributor_listing,
	session_listing,
	session_listing_with_filtration,
	session_schedule_list,
} from "../lib/listings.ts"
import { create_entry } from "../lib/strapi.ts"
import type { Strapi } from "../lib/strapi.ts"
import type { Seeded_Contributors } from "../contributors.ts"
import type { Seeded_Events } from "../events.ts"
import type { Seeded_Page_Shells } from "../page-shells.ts"
import { write_about_page } from "./about.ts"
import { write_archives_page } from "./archives.ts"
import { write_home_page } from "./home.ts"
import { write_privacy_policy_page } from "./privacy-policy.ts"

/**
 |
 | The four category listing pages.
 |
 | Each is one section holding one filtration listing, and the listing holds
 | nothing but the category — every session of it belonging to this page's event
 | is shown, and a visitor narrows the set down with the widget rather than
 | being handed a shortened one.
 |
 | The titles are what the URLs are derived from, so "Showcases" is `/showcases`
 | and is what `back_link_to_category` on the website already points a session
 | at.
 |
 */
const CATEGORY_LISTING_PAGES = [
	{
		category: "Showcase",
		title: "Showcases",
	},
	{
		category: "Experience",
		title: "Experiences",
		style_and_transition: "change-fill-on-hover",
	},
	{
		category: "Conversation",
		title: "Conversations",
	},
	{
		category: "Workshop",
		title: "Workshops",
		style_and_transition: "change-fill-on-hover",
	},
]

export async function write_pages (
	strapi: Strapi,
	page_shells: Seeded_Page_Shells,
	events: Seeded_Events,
	contributors: Seeded_Contributors,
) {
	await write_home_page( strapi, page_shells )
	await write_about_page( strapi, page_shells, contributors )
	await write_archives_page( strapi, page_shells )
	await write_privacy_policy_page( strapi, page_shells )

	// Two columns, stated rather than left to the default, because this is the
	// page the arrangement is easiest to read off: a short document with a back
	// link and a table of contents beside it in the sidebar.
	await create_entry( strapi, "api::page.page", {
		main_region: [
			section( "Legal Disclaimer", {
				heading: heading_component( "Legal Disclaimer", "h2" ),
				register_with_toc: true,
				strings: [
					"The contents of this website are for general information only and are subject to change without notice.",
				],
			} ),
			section( "Liability", {
				heading: heading_component( "Liability", "h2" ),
				register_with_toc: true,
				strings: [
					"Neither Godrej Design Lab nor any of its collaborators accepts liability for any loss arising from reliance on what is published here.",
					"Where this site links to another, the link is not an endorsement, and what sits at the other end of it is that site's own responsibility.",
				],
			} ),
		],
		page_layout: "two-column",
		page_shell: page_shells.primary.documentId,
		side_region: [
			heading( "Questions", "h4" ),
			plain_string( "Write to hello@godrejdesignlab.example." ),
		],
		title: "Legal Disclaimer",
	} )

	// The collaborators page: the grid, filled from the event this page
	// resolves to. It is the third of the three layouts, and the second of the
	// two ways a contributor listing is filled.
	await create_entry( strapi, "api::page.page", {
		main_region: [
			section( "Collaborators", {
				blocks: [ contributor_listing( "grid", 10 ) ],
				heading: heading_component( "Collaborators", "h2" ),
				register_with_toc: true,
				background_gradient: "context",
			} ),
		],
		page_shell: page_shells.primary.documentId,
		standfirst: "The people taking part this year.",
		title: "Collaborators",
		color_scheme: "contributor",
	} )

	// The four category listing pages, each holding the whole of its category.
	//
	// No heading on the section and no title on it that a reader sees: the
	// page's own name is already at the top of the sidebar, and a section
	// headed "Showcases" underneath a page headed "Showcases" says it twice.
	// The section's `title` is the editor's label for the row in the admin,
	// which is what that attribute is for.
	//
	// The page **is** its category, and `color_scheme` is where it says so:
	// the context colour points at the category, which draws the sidebar
	// beside the listing and the filtration widget inside it. The section
	// behind it fills itself from that same alias rather than naming the
	// category a second time, and takes a flat fill rather than one of the
	// fades — a fade down into grey is how the home page ends a row, and
	// these pages are one row that runs the whole way down.
	//
	// The section pads below itself and not above: the listing opens the page,
	// and its own header is what a visitor should meet at the top edge. The
	// schedule page below asks for the same thing from the other side — there
	// the block declines the space rather than the section, and either of them
	// declining is enough.
	for (
		const { category, style_and_transition, title }
			of CATEGORY_LISTING_PAGES
	) {
		await create_entry( strapi, "api::page.page", {
			main_region: [
				section( `${title} — the listing`, {
					blocks: [
						session_listing_with_filtration(
							category,
							style_and_transition,
						),
					],
					spacing_around: "below",
					background_gradient: "context",
				} ),
			],
			page_shell: page_shells.primary.documentId,
			title,
			color_scheme: category.toLowerCase(),
		} )
	}

	// The schedule page: one section holding one schedule list, which fills
	// itself with the whole of this page's event and carries that event's
	// schedule document for the download link.
	//
	// The note under the title is the static site's own, and it is the page's
	// standfirst rather than a block, because it is a caveat about the page
	// rather than about anything in it.
	//
	// The list asks for spacing below itself and none above: it opens the page,
	// and its own sticky headers are what a visitor should meet at the top
	// edge. That declines the section's top padding as well as the block's own
	// margin — see `pads_at_top` on the website.
	await create_entry( strapi, "api::page.page", {
		main_region: [
			section( "The schedule", {
				blocks: [ session_schedule_list( "below" ) ],
			} ),
		],
		page_shell: page_shells.primary.documentId,
		standfirst:
			"Please Note : This programming schedule is subject to changes",
		title: "Schedule",
	} )

	// A page belonging to the event that is **not** main. It takes 2029's
	// colours and 2029's schedule document while the header and the footer
	// above it still advertise 2027, which is the resolution rule made visible
	// in one page.
	await create_entry( strapi, "api::page.page", {
		event: events.other.documentId,
		main_region: [
			section( "Conscious Collective 2029", {
				heading: heading_component(
					"Conscious Collective 2029",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"The next one is being put together. Dates are set; the programme is not.",
				],
			} ),
			// The same component as the home page's, on a page belonging to
			// the event that is **not** main. It fills itself from 2029 while
			// the header above it still advertises 2027 — the resolution rule
			// and the listing filter, in one page.
			section( "Showcases in 2029", {
				blocks: [ session_listing( "Showcase", 10 ) ],
				heading: heading_component( "Showcases in 2029", "h2" ),
				register_with_toc: true,
			} ),
			// The schedule list, on the one page in the seed that belongs to
			// the event that is **not** main. It answers with 2029's thirteen
			// sessions rather than 2027's forty, and its download link points
			// at 2029's schedule document — the resolution rule reaching two
			// different things through one component.
			section( "The 2029 schedule", {
				blocks: [ session_schedule_list() ],
				heading: heading_component( "What is planned", "h2" ),
				register_with_toc: true,
			} ),
		],
		page_shell: page_shells.primary.documentId,
		standfirst: "A first look at what comes after this one.",
		title: "Conscious Collective 2029",
	} )

	// An archived page, on the archive shell, so that a second shell has a
	// reader.
	await create_entry( strapi, "api::page.page", {
		is_archived: true,
		main_region: [
			section( "Conscious Collective 2023", {
				heading: heading_component(
					"Conscious Collective 2023",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"A record of 2023.",
				],
			} ),
		],
		page_shell: page_shells.archive.documentId,
		title: "Archive 2023",
	} )

	// Never published. It exists so that draft preview has something to preview
	// and so that the published path provably does not serve it.
	await create_entry( strapi, "api::page.page", {
		main_region: [
			section( "Not finished", {
				heading: heading_component( "Not finished", "h2" ),
				register_with_toc: true,
				strings: [
					"This page has never been published.",
				],
			} ),
		],
		page_shell: page_shells.primary.documentId,
		published: false,
		title: "Unfinished",
	} )
}
