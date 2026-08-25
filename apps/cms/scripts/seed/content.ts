
/**
 |
 | The sample content, written against a booted Strapi.
 |
 | Two rules govern how it is written, both from the spec:
 |
 |   • **The webtools pattern rows go in directly, before any content.** They
 |     live in the database rather than in a file, so a fresh clone has none
 |     until something creates them, and every alias generated afterwards
 |     depends on them being there first.
 |
 |   • **Everything else goes through the document service.** That is what makes
 |     webtools' own middleware generate the aliases and their join rows. Writing
 |     aliases by hand would mean building the alias row *and* its link rows for
 |     both the draft and published rows sharing a document id, with a valid
 |     locale, and it would bypass the path-uniqueness middleware entirely — a
 |     copy of plugin logic that the plugin is free to change.
 |
 | This module is imported by the seed script and by the CMS test harness, which
 | is why it takes a `strapi` and neither boots nor destroys one.
 |
 */

import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

type Strapi = any

export async function write_seed_content ( strapi: Strapi ) {
	await write_url_patterns( strapi )

	const events = await write_events( strapi )
	const page_shells = await write_page_shells( strapi )
	// **Contributors come before pages**, because a page can curate a listing
	// of them by hand and a curated relation needs something to point at. The
	// sessions still come last: they are what fills a contributor's `events`,
	// and a session's own page curates a list of its neighbours.
	const contributors = await write_contributors( strapi, page_shells )
	await write_pages( strapi, page_shells, events, contributors )
	await write_sessions( strapi, page_shells, events, contributors )

	await grant_public_permissions( strapi )
}

/**
 |
 | Two events.
 |
 | 2025 is the main one, so its dates and its Register Now button are the site
 | chrome on every page — including the pages belonging to 2027. 2027 exists so
 | that the resolution rule has something to resolve *to*: a page naming it
 | keeps its colours while wearing 2025's chrome, which is the whole shape of
 | the arrangement in one pair of rows.
 |
 | The colours are the static site's inline palette, which is where they were
 | hardcoded before an editor could reach them. The RGB triplets are **not**
 | written here — a middleware derives each one from its colour on save, and
 | writing them by hand would be a second copy of that rule which could disagree
 | with the first.
 |
 */
async function write_events ( strapi: Strapi ) {
	const main = await strapi.documents( "api::event.event" ).create( {
		data: {
			colour_contributor: "#FF5C23",
			colour_conversation: "#0055E6",
			colour_experience: "#00E1B6",
			colour_showcase: "#F0503D",
			colour_theme: "#0055E6",
			colour_workshop: "#FABC1D",
			date_end: "2025-12-13",
			date_start: "2025-12-11",
			is_archived: false,
			main: true,
			name: "Conscious Collective 2025",
			schedule: await upload_schedule_document(
				strapi,
				"conscious-collective-2025-schedule.pdf",
				"Conscious Collective 2025",
			),
		},
	} )

	const other = await strapi.documents( "api::event.event" ).create( {
		data: {
			colour_contributor: "#7A5CFF",
			colour_conversation: "#1B7F4B",
			colour_experience: "#E8B4A0",
			colour_showcase: "#C2410C",
			colour_theme: "#1B7F4B",
			colour_workshop: "#F59E0B",
			date_end: "2027-12-05",
			date_start: "2027-12-02",
			is_archived: false,
			main: false,
			name: "Conscious Collective 2027",
			schedule: await upload_schedule_document(
				strapi,
				"conscious-collective-2027-schedule.pdf",
				"Conscious Collective 2027",
			),
		},
	} )

	return { main, other }
}

/**
 |
 | The schedule document, uploaded rather than linked.
 |
 | It is the one piece of media in this seed that is not a bare url, and it has
 | to be: `Event.schedule` is a media attribute with no url sibling beside it,
 | because a schedule is a file an organiser hands over rather than a picture
 | hosted somewhere else. The spec's rule for such media is a temporary file,
 | uploaded, and deleted once the upload has succeeded, which is what this does.
 |
 | The PDF is **written here rather than downloaded**. The seed makes no network
 | calls at all today and the CMS test harness runs it on every boot, so a fetch
 | would put someone else's uptime between this project and its own test suite.
 | What is written is a valid single-page PDF carrying the event's name — enough
 | that a browser opens it, which is the whole of what the download link claims.
 | Its one line of text is deliberately ASCII: the file is assembled as bytes
 | and its cross-reference table holds byte offsets, so a character that is one
 | byte in one encoding and three in another would put every offset out.
 |
 */
async function upload_schedule_document (
	strapi: Strapi,
	filename: string,
	title: string,
) {
	const directory = await fs.mkdtemp(
		path.join( os.tmpdir(), "conscious-collective-seed-" ),
	)
	const file = path.join( directory, filename )

	try {
		const pdf = one_page_pdf( `${title} - schedule` )
		await fs.writeFile( file, pdf )

		const [ uploaded ] = await strapi
			.plugin( "upload" )
			.service( "upload" )
			.upload( {
				data: {},
				files: {
					filepath: file,
					mimetype: "application/pdf",
					originalFilename: filename,
					size: pdf.length,
				},
			} )

		return uploaded.id
	} finally {
		await fs.rm( directory, { force: true, recursive: true } )
	}
}

/**
 |
 | A one-page PDF holding a single line of text, built by hand.
 |
 | Four objects, a cross-reference table and a trailer, which is the smallest
 | thing a PDF reader will open. The offsets in the table have to be the byte
 | positions of the objects, so the body is assembled first and measured rather
 | than written with the numbers guessed.
 |
 */
function one_page_pdf ( line: string ): Buffer {
	const escaped = line.replace( /([\\()])/g, "\\$1" )
	const stream = `BT /F1 24 Tf 72 720 Td (${escaped}) Tj ET`

	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] "
		+ "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
	]

	let body = "%PDF-1.4\n"
	const offsets: number[] = []

	objects.forEach( ( object, index ) => {
		offsets.push( Buffer.byteLength( body ) )
		body += `${index + 1} 0 obj\n${object}\nendobj\n`
	} )

	const start_of_table = Buffer.byteLength( body )
	const table = [
		"xref",
		`0 ${objects.length + 1}`,
		"0000000000 65535 f ",
		...offsets.map( ( offset ) =>
			`${String( offset ).padStart( 10, "0" )} 00000 n `
		),
		"trailer",
		`<< /Size ${objects.length + 1} /Root 1 0 R >>`,
		"startxref",
		String( start_of_table ),
		"%%EOF",
	].join( "\n" )

	return Buffer.from( `${body}${table}\n`, "latin1" )
}

/**
 |
 | One pattern row per routable content type, written with a direct query.
 |
 | `/[title]` interpolates the Page's own title. No content type carries a slug
 | attribute — a Link field holding entry references rather than URL strings is
 | what will keep internal links from drifting, and it is planned rather than
 | built.
 |
 | A Page titled "Home" therefore resolves to `/home`, not to `/`. A pattern of
 | `/` would be legal but identical for every Page, and the alias path column has
 | no unique constraint, so the second Page would silently become `/-0`. The
 | website tries the incoming path as it arrives and falls back to `/home` only
 | when `/` resolves to nothing.
 |
 | `languages: []` matches what the admin's own pattern screen sends for a
 | content type that is not localised.
 |
 */
async function write_url_patterns ( strapi: Strapi ) {
	await strapi.db.query( "plugin::webtools.url-pattern" ).create( {
		data: {
			contenttype: "api::page.page",
			languages: [],
			pattern: "/[title]",
		},
	} )

	await strapi.db.query( "plugin::webtools.url-pattern" ).create( {
		data: {
			contenttype: "api::session.session",
			languages: [],
			pattern: "/sessions/[name]",
		},
	} )

	await strapi.db.query( "plugin::webtools.url-pattern" ).create( {
		data: {
			contenttype: "api::contributor.contributor",
			languages: [],
			pattern: "/collaborators/[name]",
		},
	} )
}

async function write_page_shells ( strapi: Strapi ) {
	const primary = await strapi.documents( "api::page-shell.page-shell" )
		.create( {
			data: {
				default: true,
				name: "Primary",
				navigation_footer: [
					link( "godrejenterprises.com", "https://godrejenterprises.com/" ),
					link( "Privacy Policy", "/privacy-policy" ),
					link( "Legal Disclaimer", "/legal-disclaimer" ),
				],
				navigation_header: [
					link( "Showcases", "/showcases" ),
					link( "Experiences", "/experiences" ),
					link( "Conversations", "/conversations" ),
					link( "Workshops", "/workshops" ),
					link( "Schedule", "/schedule" ),
					link( "Collaborators", "/collaborators" ),
					link( "About", "/about" ),
				],
				site_description:
					"An annual gathering of designers, architects and makers, "
					+ "hosted by Godrej Design Lab.",
				site_title: "Godrej Conscious Collective",
			},
		} )

	const archive = await strapi.documents( "api::page-shell.page-shell" )
		.create( {
			data: {
				// Injected code sits on the shell rather than on a page, so it
				// is reachable only by whoever may edit site chrome. It is
				// seeded on the archive shell rather than the primary one so
				// that it has a reader without running on every seeded page.
				arbitrary_code: {
					before_head_closing: [
						{
							__component: "code.script-v1",
							code: "window.__seeded_hook = \"before_head_closing\"",
							type: "text/javascript",
						},
					],
				},
				default: false,
				name: "Archive",
				navigation_header: [
					link( "Back to this year", "/" ),
				],
				site_description:
					"Godrej Conscious Collective, in earlier years.",
				site_title: "Conscious Collective — Archive",
			},
		} )

	return { archive, primary }
}

/**
 |
 | The pages the route table names that this ticket has nothing else to say
 | about. Titles are what the URL is derived from, so they are the point.
 |
 */
const REMAINING_ROUTE_TABLE = [
	{
		standfirst: "How we collect, use and protect your personal data.",
		title: "Privacy Policy",
	},
]

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
		standfirst: "Installations and concept designs across all three days.",
		title: "Showcases",
	},
	{
		category: "Experience",
		standfirst: "Things to walk through, touch and take part in.",
		title: "Experiences",
	},
	{
		category: "Conversation",
		standfirst: "Talks and panels with the people making the work.",
		title: "Conversations",
	},
	{
		category: "Workshop",
		standfirst: "Hands-on sessions, with places to book.",
		title: "Workshops",
	},
]

async function write_pages (
	strapi: Strapi,
	page_shells: { archive: any; primary: any },
	events: { main: any; other: any },
	contributors: Seeded_Contributors,
) {
	// "Home" resolves to `/home`, and the website falls back to it when `/`
	// resolves to nothing. `/home` itself redirects permanently to `/`.
	//
	// One column, because the home page is the one the static site draws
	// full-width: the category carousels, the ticker, the Instagram strip and
	// the sponsors all run off both edges, and there is no back link or table
	// of contents to put in a sidebar.
	await create_page( strapi, {
		main_region: [
			section( "This Year's Theme", {
				heading: heading_component( "This Year’s Theme", "h2" ),
				register_with_toc: true,
				strings: [
					"Architecture and design are part of a creative industry that’s constantly evolving. The last two decades, especially, have witnessed a major transition.",
					"With the pandemic and the current climate crisis forcing us to question the way we live, eat, travel and consume things, design plays a central role in rethinking our future by helping us navigate spatially.",
				],
			} ),
			section( "What is on", {
				heading: heading_component( "What is on", "h2" ),
				register_with_toc: true,
				strings: [
					"Installations, concept designs, workshops, conversations and more, across three days.",
				],
			} ),
			// The marquee, the image stack, the Instagram strip and the
			// sponsors are the home page's own furniture in the static site.
			// They are seeded here so that every one of them has a page to be
			// looked at on.
			section( "Practicalities", {
				blocks: [
					marquee( [
						"Plant 13, Godrej Enterprises Group, Pirojshanagar, Vikhroli, Mumbai 400079",
						"11 - 13 Dec 2025",
						"9:00 AM - 10:00 PM",
					] ),
				],
				register_with_toc: false,
			} ),
			section( "Reclaiming Cool", {
				background_gradient: "white-to-light",
				background_pattern: "spider-web-1",
				background_position: "left",
				blocks: [
					{
						__component:
							"container.image-stack-and-content-v1",
						content: [
							heading( "Reclaiming Cool", "h1" ),
							plain_string(
								"Our theme for Conscious Collective 2025 is a movement for heat-resilient design, equitable futures, and climate-responsive living.",
							),
							plain_string(
								"As temperatures rise and cities become heat traps, “cool” is no longer a comfort, it’s a right.",
							),
						],
						images: [
							responsive_image( {
								alt: "A workshop in progress",
								url: IMAGES.stack_one,
							} ),
							responsive_image( {
								alt: "An installation being built",
								url: IMAGES.stack_two,
							} ),
							responsive_image( {
								alt: "Visitors at a showcase",
								url: IMAGES.stack_three,
							} ),
						],
						layout: "images-left",
					},
				],
				register_with_toc: true,
			} ),
			// The four category carousels, and the collaborators ring
			// beneath them. Every one of these holds a category and a count and
			// no rows at all: the CMS fills them from the event the page
			// resolves to, when the page is asked for.
			//
			// The heading, the opening line and the "View All" link belong to
			// the **section**, which already carries all three. A listing that
			// held its own would be a second place for a heading to live.
			section( "Showcases", {
				background_gradient: "showcase-to-light",
				blocks: [ session_listing( "Showcase", 6 ) ],
				heading: heading_component( "Showcases", "h2" ),
				link: link( "View All", "/showcases" ),
				opening_line:
					"Installations and concept designs, sited across the "
					+ "grounds for all three days.",
				register_with_toc: true,
			} ),
			section( "Experiences", {
				background_gradient: "light",
				blocks: [ session_listing( "Experience", 3 ) ],
				heading: heading_component( "Experiences", "h2" ),
				link: link( "View All", "/experiences" ),
				opening_line:
					"Things to walk through, touch and take part in.",
				register_with_toc: true,
			} ),
			section( "Conversations", {
				background_gradient: "conversation-to-light",
				background_pattern: "spider-web-2",
				background_position: "bottom-right",
				blocks: [ session_listing( "Conversation", 5 ) ],
				heading: heading_component( "Conversations", "h2" ),
				link: link( "View All", "/conversations" ),
				opening_line:
					"Talks and panels with the people making the work.",
				register_with_toc: true,
			} ),
			section( "Workshops", {
				background_gradient: "light",
				blocks: [ session_listing( "Workshop", 4 ) ],
				heading: heading_component( "Workshops", "h2" ),
				link: link( "View All", "/workshops" ),
				opening_line: "Hands-on sessions, with places to book.",
				register_with_toc: true,
			} ),
			// Left empty on purpose, so that the home page is the automatic
			// half of the contributor listing and the About page below is the
			// curated half.
			section( "Collaborators", {
				background_gradient: "collaborator-to-light",
				background_pattern: "spider-web-3",
				background_position: "left",
				blocks: [ contributor_listing( "carousel", 10 ) ],
				heading: heading_component( "Collaborators", "h2" ),
				link: link( "View All", "/collaborators" ),
				opening_line:
					"The people who made this year\u2019s programme.",
				register_with_toc: true,
			} ),
			section( "Follow our Instagram", {
				background_gradient: "conversation-to-light",
				blocks: [
					{
						__component: "media.instagram-feed-v1",
						slides: INSTAGRAM_SLIDES.map( ( slide ) =>
							image_link(
								slide.url,
								slide.label,
								slide.image,
							)
						),
					},
				],
				register_with_toc: false,
			} ),
			section( "Sponsors", {
				background_gradient: "light",
				blocks: [
					{
						__component: "list.sponsors-list-v1",
						sponsors: SPONSORS.map( ( sponsor ) => ( {
							image: image( {
								alt: sponsor.name,
								url: sponsor.url,
							} ),
							name: sponsor.name,
						} ) ),
					},
				],
				horizontal_rule: true,
				register_with_toc: false,
			} ),
		],
		page_layout: "one-column",
		page_shell: page_shells.primary.documentId,
		// Written even though a one-column page renders none of it, so that
		// switching this page back to two columns shows something in the
		// sidebar rather than an empty one.
		side_region: [
			heading( "Getting here", "h4" ),
			plain_string( "Godrej One, Vikhroli East, Mumbai." ),
		],
		standfirst:
			"Design patrons from Mumbai and beyond, celebrating the possibility "
			+ "of a conscious future.",
		title: "Home",
	} )

	await create_page( strapi, {
		main_region: [
			section( "About Conscious Collective", {
				heading: heading_component(
					"About Conscious Collective",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"At Conscious Collective, an initiative by Godrej Design Lab, we seek to bring together professionals from the industry to celebrate this conscious future.",
					"Our objective is to bring together like-minded professionals who will reimagine a more sustainable future and act as ambassadors to explore possibilities of a world that is much healthier and greener for us and for our future generations.",
				],
			} ),
			section( "A Godrej Design Lab Initiative", {
				heading: heading_component(
					"A Godrej Design Lab Initiative",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"Godrej Design Lab is an initiative of Godrej Enterprise Group to encourage and advance design excellence and exploration. It is our way to reach out and collaborate on multiple fronts with the ever growing Indian design ecosystem.",
					"Since 2015, we have worked with talented individuals, firms, and organizations to explore how design can innovate and impact, making pioneering strides in the areas of product and architectural design, material development and social impact.",
				],
			} ),
			section( "About Godrej Design Lab", {
				blocks: [
					{
						__component: "container.image-and-content-v1",
						content: [
							heading( "A word from the Director", "h3" ),
							wysiwyg( [
								"Godrej Design Lab is an initiative of Godrej Enterprises Group to encourage and advance design excellence and exploration.",
								"Since 2015, we have worked with talented individuals, firms and organisations to explore how design can innovate and impact.",
							] ),
						],
						image: image( {
							alt: "Nyrika Holkar",
							caption:
								"highlights the role of curiosity, conscious choices, and the power of design to shape a better tomorrow.",
							title:
								"Nyrika Holkar, Executive Director, Godrej Enterprises Group",
							url: IMAGES.portrait_two,
						} ),
						layout: "image-right",
					},
					quote(
						"A life spent making mistakes is not only more honorable, but more useful than a life spent doing nothing.",
						"George Bernard Shaw, playwright, critic, polemicist",
						IMAGES.portrait_one,
					),
					gallery( "wide-first", [
						{
							alt: "",
							caption:
								"Debasmita explores the push and pull between age-old practices and modern dreams.",
							title: "Living with the Land",
							url: IMAGES.gallery_one,
						},
						{
							alt: "",
							caption:
								"Native cotton, and the people who still grow it.",
							title: "Reweaving the Ecosystem",
							url: IMAGES.gallery_two,
						},
					] ),
				],
				heading: heading_component(
					"About Godrej Design Lab",
					"h2",
				),
				horizontal_rule: true,
				opening_line:
					"How the Lab supports Conscious Collective, and who is behind it.",
				register_with_toc: true,
			} ),
			// The two media leaves that no composite carries for them: an image
			// on its own, and a responsive image on its own. Both are in the
			// catalogue and both were reachable only through a container until
			// now, so neither had a page to be looked at on.
			section( "Inside the Lab", {
				blocks: [
					image_block( {
						alt: "The Lab's workshop floor, mid-build",
						caption:
							"Photographed on the last afternoon before the 2024 edition opened.",
						title: "The workshop floor",
						url: IMAGES.gallery_two,
					} ),
					responsive_image_block( {
						alt: "The courtyard the event is built around",
						caption:
							"Cropped tall on a phone, landscape from 1024 pixels and letterboxed from 1440 — the same courtyard, framed for the space it lands in.",
						large: IMAGES.art_direction_large,
						medium: IMAGES.art_direction_medium,
						small: IMAGES.art_direction_small,
						title: "The courtyard",
					} ),
				],
				heading: heading_component( "Inside the Lab", "h2" ),
				opening_line:
					"Where the work is made, and where it is shown.",
				register_with_toc: true,
			} ),
			section( "The Core Team", {
				blocks: [
					{
						__component: "list.profile-list-v1",
						profiles: TEAM.map( ( person ) => ( {
							description: person.description,
							image: image( {
								alt: person.name,
								url: person.image,
							} ),
							name: person.name,
							role: person.role,
						} ) ),
					},
				],
				heading: heading_component( "The Core Team", "h2" ),
				horizontal_rule: true,
				register_with_toc: true,
			} ),
			section( "Location", {
				blocks: [
					{
						__component: "container.map-and-content-v1",
						content: [
							plain_string(
								"Please arrive prepared for a grand buffet at the offsite location.",
							),
						],
						layout: "map-left",
						map: google_map( {
							address:
								"Plant 13, Godrej Enterprises Group\nPirojshanagar, Vikhroli, Mumbai 400079",
							image_url: IMAGES.sketch_map,
							label: "View on Maps",
							map_url: "https://example.com/maps/plant-13",
						} ),
					},
					{
						__component: "miscellaneous.horizontal-rule-v1",
						shade: "light",
					},
					{
						__component: "media.vanilla-carousel-v1",
						slides: INSTAGRAM_SLIDES.slice( 0, 4 ).map( (
							slide,
						) => image_link(
							slide.url,
							slide.label,
							slide.image,
						) ),
					},
				],
				heading: heading_component( "Location", "h2" ),
				horizontal_rule: true,
				register_with_toc: true,
			} ),
			// The **curated** half of the contributor listing: three people,
			// named, in an order somebody chose. The home page's is the same
			// component with the relation left empty.
			section( "Who is behind it", {
				blocks: [
					contributor_listing( "natural", 10, [
						contributors.arthur,
						contributors.debasmita,
						contributors.kaveri,
					] ),
				],
				heading: heading_component( "Who is behind it", "h2" ),
				register_with_toc: true,
			} ),
			// Deliberately not registered with the table of contents, so that
			// the opt-in is observable rather than assumed.
			section( "Colophon", {
				register_with_toc: false,
				strings: [
					"This page came from a database.",
				],
			} ),
		],
		page_shell: page_shells.primary.documentId,
		side_region: [
			plain_string( "Godrej Design Lab, since 2015." ),
		],
		title: "About",
	} )

	// Two columns, stated rather than left to the default, because this is the
	// page the arrangement is easiest to read off: a short document with a back
	// link and a table of contents beside it in the sidebar.
	await create_page( strapi, {
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
	await create_page( strapi, {
		main_region: [
			section( "Collaborators", {
				blocks: [ contributor_listing( "grid", 10 ) ],
				heading: heading_component( "Collaborators", "h2" ),
				register_with_toc: true,
			} ),
		],
		page_shell: page_shells.primary.documentId,
		standfirst: "The people taking part this year.",
		title: "Collaborators",
	} )

	// The four category listing pages, each holding the whole of its category.
	//
	// No heading on the section and no title on it that a reader sees: the
	// page's own name is already at the top of the sidebar, and a section
	// headed "Showcases" underneath a page headed "Showcases" says it twice.
	// The section's `title` is the editor's label for the row in the admin,
	// which is what that attribute is for.
	for ( const { category, standfirst, title } of CATEGORY_LISTING_PAGES ) {
		await create_page( strapi, {
			main_region: [
				section( `${title} — the listing`, {
					blocks: [ session_listing_with_filtration( category ) ],
				} ),
			],
			page_shell: page_shells.primary.documentId,
			standfirst,
			title,
		} )
	}

	// The schedule page: one section holding one schedule list, which fills
	// itself with the whole of this page's event and carries that event's
	// schedule document for the download link.
	//
	// The note under the title is the static site's own, and it is the page's
	// standfirst rather than a block, because it is a caveat about the page
	// rather than about anything in it.
	await create_page( strapi, {
		main_region: [
			section( "The schedule", {
				blocks: [ session_schedule_list() ],
			} ),
		],
		page_shell: page_shells.primary.documentId,
		standfirst:
			"Everything that is on, day by day. This programming schedule is "
			+ "subject to changes.",
		title: "Schedule",
	} )

	// The rest of the route table.
	//
	// Every one of these is linked from the page shell's navigation, so
	// leaving them out would have the site chrome advertising a URL that
	// answers 404. They are thin on purpose: each becomes a real page when the
	// ticket that owns it arrives.
	for ( const { standfirst, title } of REMAINING_ROUTE_TABLE ) {
		await create_page( strapi, {
			main_region: [
				section( title, {
					heading: heading_component( title, "h2" ),
					register_with_toc: true,
					strings: [ standfirst ],
				} ),
			],
			page_shell: page_shells.primary.documentId,
			standfirst,
			title,
		} )
	}

	// A page belonging to the event that is **not** main. It takes 2027's
	// colours and 2027's schedule document while the header and the footer
	// above it still advertise 2025, which is the resolution rule made visible
	// in one page.
	await create_page( strapi, {
		event: events.other.documentId,
		main_region: [
			section( "Conscious Collective 2027", {
				heading: heading_component(
					"Conscious Collective 2027",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"The next one is being put together. Dates are set; the programme is not.",
				],
			} ),
			// The same component as the home page's, on a page belonging to
			// the event that is **not** main. It fills itself from 2027 while
			// the header above it still advertises 2025 — the resolution rule
			// and the listing filter, in one page.
			section( "Showcases in 2027", {
				blocks: [ session_listing( "Showcase", 10 ) ],
				heading: heading_component( "Showcases in 2027", "h2" ),
				register_with_toc: true,
			} ),
			// The schedule list, on the one page in the seed that belongs to
			// the event that is **not** main. It answers with 2027's thirteen
			// sessions rather than 2025's forty, and its download link points
			// at 2027's schedule document — the resolution rule reaching two
			// different things through one component.
			section( "The 2027 schedule", {
				blocks: [ session_schedule_list() ],
				heading: heading_component( "What is planned", "h2" ),
				register_with_toc: true,
			} ),
		],
		page_shell: page_shells.primary.documentId,
		standfirst: "A first look at what comes after this one.",
		title: "Conscious Collective 2027",
	} )

	// An archived page, on the archive shell, so that a second shell has a
	// reader.
	await create_page( strapi, {
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
	await create_page( strapi, {
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

async function create_page (
	strapi: Strapi,
	{ published = true, ...data }: Record<string, any>,
) {
	return await strapi.documents( "api::page.page" ).create( {
		data,
		status: published ? "published" : "draft",
	} )
}

/* _____
 | Contributors.
 |
 | Six people, each with a page of the CMS's simplest publishable content type.
 | Draft-and-publish is off on the schema, so every one of them is live at its
 | URL the moment it is written — see decision record 00002 for why.
 |
 | Each contributor is created here without any `events`. The relation is
 | hidden, read-only and maintained by `derive_contributor_events`, which fills
 | it in when the sessions below attach these contributors on publish.
 |
 */
type Seeded_Contributors = {
	debasmita: any
	arthur: any
	priya: any
	rahul: any
	kaveri: any
	iris: any
}

async function write_contributors (
	strapi: Strapi,
	page_shells: { archive: any; primary: any },
): Promise<Seeded_Contributors> {
	const shell = page_shells.primary.documentId
	const contributor = strapi.documents( "api::contributor.contributor" )

	const debasmita = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Debasmita Ghosh is an installation artist whose work sits "
					+ "at the edge of craft and climate.",
				"She has spent the last three years working with the Kondh "
					+ "community in Odisha's Rayagada district.",
			),
			image: image( {
				alt: "Debasmita Ghosh",
				url: IMAGES.portrait_one,
			} ),
			name: "Debasmita Ghosh",
			page_shell: shell,
			role: "Installation artist",
		},
	} )

	const arthur = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Arthur Mamou-Mani is a Franco-British architect known for "
					+ "large-scale timber structures that visitors can walk "
					+ "under.",
			),
			image: image( {
				alt: "Arthur Mamou-Mani",
				url: IMAGES.portrait_four,
			} ),
			name: "Arthur Mamou-Mani",
			page_shell: shell,
			role: "Architect",
		},
	} )

	const priya = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Priya Iyer is a workshop facilitator who has taught block "
					+ "printing to two decades of children across Mumbai.",
			),
			image: image( { alt: "Priya Iyer", url: IMAGES.portrait_two } ),
			name: "Priya Iyer",
			page_shell: shell,
			role: "Workshop facilitator",
		},
	} )

	const rahul = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Rahul Verma is an urban ecologist writing about the design "
					+ "choices that decide who a city stays cool for.",
			),
			image: image( {
				alt: "Rahul Verma",
				url: IMAGES.portrait_three,
			} ),
			name: "Rahul Verma",
			page_shell: shell,
			role: "Urban ecologist",
		},
	} )

	// Belongs to the 2027 event's sessions only — so this contributor's
	// events list points at 2027 rather than at 2025.
	const kaveri = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Kaveri Nair is a curator putting the 2027 programme "
					+ "together.",
			),
			image: image( { alt: "Kaveri Nair", url: IMAGES.portrait_one } ),
			name: "Kaveri Nair",
			page_shell: shell,
			role: "Curator",
		},
	} )

	// Only attached to a draft session below. The middleware derives events
	// from **published** sessions only, so this contributor stays eventless
	// and appears in no edition listing — the archival rule the schema asks
	// for, applied to a contributor whose work is not yet announced.
	const iris = await contributor.create( {
		data: {
			blurb: paragraphs(
				"Not announced yet, but has a page to prove it. The events "
					+ "list for this row is empty because the one session "
					+ "that links them is a draft.",
			),
			image: image( { alt: "Iris Han", url: IMAGES.portrait_three } ),
			name: "Iris Han",
			page_shell: shell,
			role: "Guest programmer",
		},
	} )

	return { arthur, debasmita, iris, kaveri, priya, rahul }
}

/**
 |
 | Rich-text paragraphs in Strapi's `blocks` shape. Contributor.blurb is a
 | blocks field, and this is what its value looks like on disk.
 |
 */
function paragraphs ( ...lines: string[] ) {
	return lines.map( ( line ) => ( {
		children: [ { text: line, type: "text" } ],
		type: "paragraph",
	} ) )
}

/* _____
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
async function write_sessions (
	strapi: Strapi,
	page_shells: { archive: any; primary: any },
	events: { main: any; other: any },
	contributors: Seeded_Contributors,
) {
	const shell = page_shells.primary.documentId
	const main = events.main.documentId

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
		main_region: [
			section( "Living with the Land", {
				// A standalone image inside a two-column page, where the
				// About page's pair sit on a wider one: the block is the same
				// and the width it gets is not.
				blocks: [
					image_block( {
						alt: "A Kondh house, half rebuilt",
						caption:
							"Built over three weeks with the Kondh youth who will use it.",
						title: "The house, part way through",
						url: IMAGES.stack_one,
					} ),
				],
				heading: heading_component( "Living with the Land", "h2" ),
				register_with_toc: true,
				strings: [
					"Debasmita Ghosh’s installation stems from months spent working closely with the Kondh community in Odisha’s Rayagada district.",
					"Through hands-on workshops with Kondh youth, Debasmita explores the push and pull between age-old practices and modern dreams.",
				],
			} ),
			section( "About Sustaina India", {
				blocks: [
					gallery( "equal", [
						{
							alt: "",
							caption:
								"Debasmita explores the push and pull between age-old practices and modern dreams.",
							title: "Living with the Land",
							url: IMAGES.gallery_one,
						},
						{
							alt: "",
							caption:
								"Native cotton, and the people who still grow it.",
							title: "Reweaving the Ecosystem",
							url: IMAGES.gallery_two,
						},
					] ),
				],
				heading: heading_component( "About Sustaina India", "h2" ),
				horizontal_rule: true,
				register_with_toc: true,
			} ),
		],
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
		main_region: [
			section( "Block Printing with Native Cotton", {
				heading: heading_component(
					"What you will make",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"Two hours at the table with a set of hand-cut blocks and a length of organic khadi to take home.",
				],
			} ),
		],
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
		main_region: [
			section( "Designing for Heat", {
				heading: heading_component( "Designing for Heat", "h2" ),
				register_with_toc: true,
				strings: [
					"Three practitioners on what a heat-resilient city asks of the people who draw it.",
				],
			} ),
		],
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
		main_region: [
			section( "The Cooling Pergola", {
				heading: heading_component( "The Cooling Pergola", "h2" ),
				register_with_toc: true,
				strings: [
					"Walk under twelve metres of woven bamboo and feel the temperature drop.",
				],
			} ),
		],
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
		main_region: [
			section( "Notes for 2027", {
				heading: heading_component( "Notes for 2027", "h2" ),
				register_with_toc: true,
				strings: [
					"An early look at what comes after this one.",
				],
			} ),
		],
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
			section( "Repairing What You Own", {
				heading: heading_component(
					"Repairing What You Own",
					"h2",
				),
				register_with_toc: true,
				strings: [
					"Bring one broken thing. Leave with it working, or with a plan.",
				],
			} ),
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
		main_region: [
			section( "Unannounced", {
				heading: heading_component( "Unannounced", "h2" ),
				register_with_toc: true,
				strings: [ "This session has never been published." ],
			} ),
		],
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
		main_region: [
			section( "Still Being Written", {
				heading: heading_component( "Still Being Written", "h2" ),
				register_with_toc: true,
				strings: [ "Announced when it is ready." ],
			} ),
		],
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
			main_region: [
				section( filler.name, {
					heading: heading_component( filler.name, "h2" ),
					register_with_toc: true,
					strings: [ filler.standfirst ],
				} ),
			],
			name: filler.name,
			page_shell: shell,
			price: filler.price,
			standfirst: filler.standfirst,
			venue: link( filler.venue, "https://example.com/maps/plant-13" ),
		} )
	}
}

async function create_session (
	strapi: Strapi,
	{ published = true, ...data }: Record<string, any>,
) {
	return await strapi.documents( "api::session.session" ).create( {
		data,
		status: published ? "published" : "draft",
	} )
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

/**
 |
 | The rest of the programme, one line each.
 |
 | Every one of these becomes a page of its own, and what they are really for is
 | the category listings and the schedule page — **a listing capped at ten needs
 | more than ten sessions in one category before the cap is observable**, which
 | is why there are this many rather than a handful.
 |
 | They are thin by design: a name, a line, one instance and a venue. The
 | sessions above carry the content worth reading; these carry the count.
 |
 */
const PROGRAMME = [
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined as string | undefined,
		day: "2025-12-11",
		from: "10:00",
		name: "Reweaving the Ecosystem",
		price: 1599,
		standfirst:
			"India’s fading indigenous cotton, and the people still growing it.",
		to: "20:00",
		venue: "Gallery One",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-12",
		from: "10:00",
		name: "Making the Invisible Visible",
		price: 1599,
		standfirst:
			"Indoor heat, unpaid domestic work and women’s resilience.",
		to: "20:00",
		venue: "Gallery One",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "10:00",
		name: "The Force Within",
		price: 0,
		standfirst: "A room that answers to the weather outside it.",
		to: "20:00",
		venue: "Gallery Two",
		year: 2025,
	},
	{
		age_group: "Children",
		category: "Experience",
		checkout_url: "https://example.com/cc/shade-garden",
		day: "2025-12-12",
		from: "09:30",
		name: "The Shade Garden",
		price: 0,
		standfirst: "Forty species that ask for no water and give back shade.",
		to: "18:00",
		venue: "North Lawn",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Experience",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "09:30",
		name: "Soundings from the Mangrove",
		price: 300,
		standfirst:
			"Two years of recordings from the creek, played back at scale.",
		to: "18:00",
		venue: "The Dark Room",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2025-12-11",
		from: "15:00",
		name: "Who Pays for Cool",
		price: undefined as number | undefined,
		standfirst: "Cooling as a right, and who is left out of it.",
		to: "16:30",
		venue: "The Conversation Stage",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "15:00",
		name: "Building with What Is Already There",
		price: undefined,
		standfirst: "Reuse, retrofit and the case against the new.",
		to: "16:30",
		venue: "The Conversation Stage",
		year: 2025,
	},
	{
		age_group: "Children",
		category: "Workshop",
		checkout_url: "https://example.com/cc/clay-pots",
		day: "2025-12-11",
		from: "11:00",
		name: "Cooling Pots in Clay",
		price: 350,
		standfirst: "Throw a pot that keeps water cold without a plug.",
		to: "13:00",
		venue: "Studio One",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Workshop",
		checkout_url: "https://example.com/cc/reading-a-site",
		day: "2025-12-13",
		from: "11:00",
		name: "Reading a Site for Heat",
		price: 900,
		standfirst:
			"An afternoon with a thermal camera and a plan of the plant.",
		to: "14:00",
		venue: "Studio Two",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Experience",
		checkout_url: undefined,
		day: "2027-12-02",
		from: "10:00",
		name: "A First Walk Through 2027",
		price: undefined,
		standfirst: "The site as it stands, a year out.",
		to: "17:00",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "All",
		category: "Workshop",
		checkout_url: undefined,
		day: "2027-12-04",
		from: "11:00",
		name: "Drawing What Comes Next",
		price: undefined,
		standfirst:
			"An open table for whoever wants a hand in what comes next.",
		to: "13:00",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-11",
		from: "10:00",
		name: "Terracotta, Recast",
		price: 1599,
		standfirst:
			"A roof tile redrawn for a city that no longer cools at night.",
		to: "20:00",
		venue: "Gallery One",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-12",
		from: "10:00",
		name: "The Weight of Water",
		price: 1200,
		standfirst: "What a household carries, measured over one summer week.",
		to: "20:00",
		venue: "Gallery Two",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "10:00",
		name: "Kiln and Contour",
		price: 0,
		standfirst: "Fired earth shaped to the land it came out of.",
		to: "20:00",
		venue: "Gallery Two",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-11",
		from: "10:00",
		name: "Threads of the Deccan",
		price: 1599,
		standfirst: "Six weaving households, one loom rebuilt in the round.",
		to: "20:00",
		venue: "Gallery One",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-11",
		from: "10:00",
		name: "A Wall That Breathes",
		price: undefined,
		standfirst: "A prototype facade tested through three Mumbai summers.",
		to: "20:00",
		venue: "North Lawn",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-12",
		from: "10:00",
		name: "Salt, Sun, Settlement",
		price: 1200,
		standfirst: "The Rann as a drawing, over sixty years.",
		to: "20:00",
		venue: "Gallery Three",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "10:00",
		name: "After the Monsoon",
		price: undefined,
		standfirst: "What the water leaves, and what is built on it.",
		to: "20:00",
		venue: "Gallery Three",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2025-12-12",
		from: "10:00",
		name: "Common Ground",
		price: 0,
		standfirst: "Twelve courtyards, photographed at the same hour.",
		to: "20:00",
		venue: "Gallery Three",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Experience",
		checkout_url: undefined,
		day: "2025-12-11",
		from: "09:30",
		name: "The Listening Room",
		price: 300,
		standfirst: "Sit for ten minutes with a city you cannot see.",
		to: "18:00",
		venue: "The Dark Room",
		year: 2025,
	},
	{
		age_group: "Children",
		category: "Experience",
		checkout_url: undefined,
		day: "2025-12-12",
		from: "09:30",
		name: "Barefoot on Seven Surfaces",
		price: 0,
		standfirst: "Stone, clay, grass, gravel, tile, timber and tar.",
		to: "18:00",
		venue: "North Lawn",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Experience",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "09:30",
		name: "A Room at Forty Degrees",
		price: undefined,
		standfirst: "Ten minutes inside the summer we are designing for.",
		to: "18:00",
		venue: "Pavilion",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Experience",
		checkout_url: "https://example.com/cc/long-table",
		day: "2025-12-11",
		from: "12:00",
		name: "The Long Table",
		price: 450,
		standfirst: "Eat with strangers, at a table built for the week.",
		to: "15:00",
		venue: "North Lawn",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Experience",
		checkout_url: undefined,
		day: "2025-12-11",
		from: "11:00",
		name: "Wind Tunnel, Slowly",
		price: undefined,
		standfirst: "Watch air find its way through six plans.",
		to: "17:00",
		venue: "Pavilion",
		year: 2025,
	},
	{
		age_group: "Children",
		category: "Experience",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "11:00",
		name: "Ink and Rain",
		price: 0,
		standfirst: "A drawing finished by the weather.",
		to: "17:00",
		venue: "Studio One",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2025-12-12",
		from: "15:00",
		name: "The Cost of Comfort",
		price: undefined,
		standfirst: "Who pays for the air conditioning, and who cannot.",
		to: "16:30",
		venue: "The Conversation Stage",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "11:00",
		name: "Drawing for the Unbuilt",
		price: undefined,
		standfirst: "Three practices on the work that never breaks ground.",
		to: "12:30",
		venue: "The Conversation Stage",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Conversation",
		checkout_url: undefined,
		day: "2025-12-11",
		from: "17:00",
		name: "What the Craftsperson Knows",
		price: undefined,
		standfirst: "Knowledge that never made it into a specification.",
		to: "18:30",
		venue: "The Conversation Stage",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2025-12-12",
		from: "11:00",
		name: "Material Honesty, Revisited",
		price: 0,
		standfirst: "An old argument, put to people who build now.",
		to: "12:30",
		venue: "Seminar Room",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2025-12-11",
		from: "11:00",
		name: "Heat and the Working Day",
		price: undefined,
		standfirst: "Labour, shade and the hours nobody schedules.",
		to: "12:30",
		venue: "Seminar Room",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Conversation",
		checkout_url: undefined,
		day: "2025-12-13",
		from: "17:00",
		name: "Twenty Years of the Lab",
		price: undefined,
		standfirst: "What the Lab set out to do, and what it did.",
		to: "18:30",
		venue: "The Conversation Stage",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Workshop",
		checkout_url: "https://example.com/cc/lime-plaster",
		day: "2025-12-12",
		from: "09:30",
		name: "Lime Plaster, Start to Finish",
		price: 1200,
		standfirst: "Slake, mix, float. One panel each, taken home wet.",
		to: "13:00",
		venue: "Studio One",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Workshop",
		checkout_url: "https://example.com/cc/bamboo-joints",
		day: "2025-12-13",
		from: "14:00",
		name: "Bamboo Joints Without Nails",
		price: 800,
		standfirst: "Six joints, a saw and an afternoon.",
		to: "17:00",
		venue: "Studio Two",
		year: 2025,
	},
	{
		age_group: "Children",
		category: "Workshop",
		checkout_url: "https://example.com/cc/natural-dye",
		day: "2025-12-12",
		from: "09:30",
		name: "Natural Dye from the Kitchen",
		price: 0,
		standfirst: "Onion skin, turmeric, tea and iron.",
		to: "12:00",
		venue: "Studio One",
		year: 2025,
	},
	{
		age_group: "Adults",
		category: "Workshop",
		checkout_url: "https://example.com/cc/the-section",
		day: "2025-12-11",
		from: "14:00",
		name: "Drawing the Section",
		price: 600,
		standfirst: "The one drawing that says how a building works.",
		to: "17:00",
		venue: "Seminar Room",
		year: 2025,
	},
	{
		age_group: "Children",
		category: "Workshop",
		checkout_url: undefined,
		day: "2025-12-12",
		from: "16:00",
		name: "Paper, Folded for Shade",
		price: 0,
		standfirst: "A screen you fold in two hours and unfold at home.",
		to: "18:00",
		venue: "Studio Two",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Workshop",
		checkout_url: "https://example.com/cc/your-street",
		day: "2025-12-12",
		from: "14:00",
		name: "Measuring Your Own Street",
		price: undefined,
		standfirst: "A tape, a thermometer and one hour outside.",
		to: "15:30",
		venue: "Plant 13 Gate",
		year: 2025,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2027-12-02",
		from: "10:00",
		name: "Site Notes: The North Yard",
		price: undefined,
		standfirst: "What is there now, before anything is proposed.",
		to: "18:00",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "All",
		category: "Showcase",
		checkout_url: undefined,
		day: "2027-12-03",
		from: "10:00",
		name: "Site Notes: The Water Tank",
		price: undefined,
		standfirst: "A structure nobody has decided what to do with.",
		to: "18:00",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2027-12-02",
		from: "15:00",
		name: "An Open Brief",
		price: undefined,
		standfirst: "The theme, still being argued about, in public.",
		to: "16:30",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2027-12-03",
		from: "15:00",
		name: "Who Should Be Here",
		price: undefined,
		standfirst: "On who the next one is actually for.",
		to: "16:30",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "Adults",
		category: "Conversation",
		checkout_url: undefined,
		day: "2027-12-05",
		from: "11:00",
		name: "Two Years of Lead Time",
		price: undefined,
		standfirst: "What can be built when there is time to build it.",
		to: "12:30",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "All",
		category: "Experience",
		checkout_url: undefined,
		day: "2027-12-03",
		from: "10:00",
		name: "Prototype Yard",
		price: undefined,
		standfirst: "Half-finished things, shown on purpose.",
		to: "17:00",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "All",
		category: "Experience",
		checkout_url: undefined,
		day: "2027-12-04",
		from: "10:00",
		name: "The Shade Trial",
		price: undefined,
		standfirst: "Six canopies, one summer, no conclusions yet.",
		to: "17:00",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "Adults",
		category: "Experience",
		checkout_url: undefined,
		day: "2027-12-05",
		from: "10:00",
		name: "A Walk with the Engineers",
		price: undefined,
		standfirst: "The plant as the people who run it see it.",
		to: "17:00",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "Adults",
		category: "Workshop",
		checkout_url: undefined,
		day: "2027-12-02",
		from: "11:00",
		name: "Making the Brief",
		price: undefined,
		standfirst: "Bring a proposal; leave with it argued over.",
		to: "13:00",
		venue: "Plant 13",
		year: 2027,
	},
	{
		age_group: "Adults",
		category: "Workshop",
		checkout_url: undefined,
		day: "2027-12-05",
		from: "14:00",
		name: "Casting a Test Panel",
		price: undefined,
		standfirst: "One panel, one mix, one week to cure.",
		to: "16:00",
		venue: "Plant 13",
		year: 2027,
	},
]

/**
 |
 | The Public role's permissions.
 |
 | Not content, and not written through the document service — the
 | users-permissions plugin keeps its grid in its own table. A fresh database
 | has nothing granted, so without this the website's very first request answers
 | 403 and reads as a bug in the envelope route.
 |
 | `page.find` is what the envelope route checks before it looks a path up.
 | `envelope.find` is the route's own permission.
 |
 */
async function grant_public_permissions ( strapi: Strapi ) {
	const actions = [
		"api::contributor.contributor.find",
		"api::envelope.envelope.find",
		"api::page.page.find",
		"api::session.session.find",
	]

	const role = await strapi.db
		.query( "plugin::users-permissions.role" )
		.findOne( { where: { type: "public" } } )

	if ( !role ) {
		throw new Error(
			`The Public role is missing, so no permission could be granted. `
				+ `Strapi creates it at bootstrap, so the seed has run against a `
				+ `Strapi that did not finish booting.`,
		)
	}

	for ( const action of actions ) {
		const existing = await strapi.db
			.query( "plugin::users-permissions.permission" )
			.findOne( { where: { action, role: role.id } } )

		if ( existing ) {
			continue
		}

		await strapi.db
			.query( "plugin::users-permissions.permission" )
			.create( { data: { action, role: role.id } } )
	}
}

/* _____
 | Pictures, and the people in them.
 |
 | Every url points somewhere else. **No image is stored in this repository** —
 | the image component carries a `url` beside its `file` for exactly this, and
 | the seed uses it so that a fresh clone needs no binary assets and no upload
 | step to have a page worth looking at.
 |
 */
const IMAGES = {
	// Three crops of one photograph, for the responsive image: tall on a
	// phone, landscape from the medium breakpoint, and letterboxed from the
	// large one. Art direction rather than resolution — the same picture,
	// framed for the shape of the space it lands in. Anything cropped this way
	// has to be one subject at three widths, which is why all three carry the
	// same photograph's id and differ only in the box asked for.
	art_direction_large:
		"https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&h=600&auto=format&fit=crop",
	art_direction_medium:
		"https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1024&h=576&auto=format&fit=crop",
	art_direction_small:
		"https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=480&h=640&auto=format&fit=crop",
	gallery_one:
		"https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=720&auto=format&fit=crop",
	gallery_two:
		"https://images.unsplash.com/photo-1591299177061-2151e53fcaea?q=80&w=720&auto=format&fit=crop",
	portrait_four:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/cc-collaborator__04.png",
	portrait_one:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/cc-collaborator__01.png",
	portrait_three:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/cc-collaborator__03.png",
	portrait_two:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/cc-collaborator__02.png",
	sketch_map:
		"https://media.cocomo.199101991.xyz/locales/the-shire__sketch-map.svg",
	stack_one:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/cc-2024__01.png",
	stack_three:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/cc-2024__02.png",
	stack_two:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/arthur-mamou-mani.jpg",
}

/* _____
 | Session covers, filed the way the static site files them.
 |
 | The static site's programme carries one photograph per session, and every one
 | of them sits under that session's own type. Keeping the same filing here is
 | what lets a session this seed invents land on a picture that suits its
 | category, rather than on whichever url came next.
 |
 | There are more sessions here than there are photographs there, so each pool
 | is dealt round and repeats. The static site repeats them too — the same set
 | fills its listing, its archive and its social strip.
 |
 | Asked for at the width the large art-directed crop uses, because a cover is
 | drawn masthead-wide behind a session's name rather than card-wide.
 |
 | **No alternative text travels with any of them.** A cover is drawn beside
 | the session's own name in both places it appears — the masthead and the
 | card — so the picture is decoration there, and an empty alt is the correct
 | one. The seed knows the static site's session these came from; it does not
 | know what the photograph shows.
 |
 | The keys name the subject of the static site's session rather than the
 | photograph, which is the most that can honestly be said about a stock
 | picture chosen for a sample programme.
 |
 */
const COVERS = {
	Conversation: {
		air_quality:
			"https://images.unsplash.com/photo-1597738755960-aeab75744b5e?q=80&w=1600&auto=format&fit=crop",
		bamboo_building:
			"https://images.unsplash.com/photo-1739713908506-aff1394c41d9?q=80&w=1600&auto=format&fit=crop",
		cities_in_balance:
			"https://images.unsplash.com/photo-1683062409353-28e0515dcc0e?q=80&w=1600&auto=format&fit=crop",
		composting:
			"https://images.unsplash.com/photo-1483366774565-c783b9f70e2c?q=80&w=1600&auto=format&fit=crop",
		embodied_carbon:
			"https://images.unsplash.com/photo-1767286795458-32a88bdefbe5?q=80&w=1600&auto=format&fit=crop",
		living_infrastructure:
			"https://images.unsplash.com/photo-1760436446540-d22739f0e3c4?q=80&w=1600&auto=format&fit=crop",
	},
	Experience: {
		animation:
			"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop",
		drift:
			"https://images.unsplash.com/photo-1519862337475-9a05735f4519?q=80&w=1600&auto=format&fit=crop",
		listening:
			"https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1600&auto=format&fit=crop",
		permaculture:
			"https://images.unsplash.com/photo-1710871398930-c2967d93196f?q=80&w=1600&auto=format&fit=crop",
		rock_balancing:
			"https://images.unsplash.com/photo-1763426294947-9ff31811820a?q=80&w=1600&auto=format&fit=crop",
		sacred_groves:
			"https://images.unsplash.com/photo-1525286335722-c30c6b5df541?q=80&w=1600&auto=format&fit=crop",
		shoreline:
			"https://images.unsplash.com/photo-1645217923157-5aff743c9de7?q=80&w=1600&auto=format&fit=crop",
		water_stories:
			"https://images.unsplash.com/photo-1770355302457-10d2b94c2220?q=80&w=1600&auto=format&fit=crop",
	},
	Showcase: {
		courtyards:
			"https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1600&auto=format&fit=crop",
		eco_typography:
			"https://images.unsplash.com/photo-1489058535093-8f530d789c3b?q=80&w=1600&auto=format&fit=crop",
		flow: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=1600&auto=format&fit=crop",
		heat_resilient_shade:
			"https://images.unsplash.com/photo-1777303799010-d062e096c5ff?q=80&w=1600&auto=format&fit=crop",
		native_cotton:
			"https://images.unsplash.com/photo-1763365716252-b34f6e500bdc?q=80&w=1600&auto=format&fit=crop",
		supercool:
			"https://images.unsplash.com/photo-1641255122178-a5aa1f828ca7?q=80&w=1600&auto=format&fit=crop",
		textiles:
			"https://images.unsplash.com/photo-1486272812091-a9bf3c6376c5?q=80&w=1600&auto=format&fit=crop",
		urban_forest:
			"https://images.unsplash.com/photo-1777353245243-831faded69f8?q=80&w=1600&auto=format&fit=crop",
	},
	Workshop: {
		bamboo_joints:
			"https://images.unsplash.com/photo-1522517779552-6cf4c1f31ee3?q=80&w=1600&auto=format&fit=crop",
		brickwork:
			"https://images.unsplash.com/photo-1552240390-5aec540311b4?q=80&w=1600&auto=format&fit=crop",
		charpai_weaving:
			"https://images.unsplash.com/photo-1643026063352-9af8ef302b81?q=80&w=1600&auto=format&fit=crop",
		clay_moulding:
			"https://images.unsplash.com/photo-1753164725860-ffcd260b7b32?q=80&w=1600&auto=format&fit=crop",
		earthen_materials:
			"https://images.unsplash.com/photo-1764351661280-bda9c2a653ff?q=80&w=1600&auto=format&fit=crop",
		gardening_basics:
			"https://images.unsplash.com/photo-1567943183748-3a7542120c90?q=80&w=1600&auto=format&fit=crop",
		kids_eco_homes:
			"https://images.unsplash.com/photo-1776684012353-787d693dda8f?q=80&w=1600&auto=format&fit=crop",
		mangrove_restoration:
			"https://images.unsplash.com/photo-1520587393050-c5298e1a8486?q=80&w=1600&auto=format&fit=crop",
		natural_dye:
			"https://images.unsplash.com/photo-1538153126577-dcd6a3cf614e?q=80&w=1600&auto=format&fit=crop",
		nature_craft:
			"https://images.unsplash.com/photo-1748803798842-f179b4b61c90?q=80&w=1600&auto=format&fit=crop",
		passive_cooling:
			"https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=80&w=1600&auto=format&fit=crop",
		potpourri:
			"https://images.unsplash.com/photo-1483137140003-ae073b395549?q=80&w=1600&auto=format&fit=crop",
		upcycling:
			"https://images.unsplash.com/photo-1486718448742-163732cd1544?q=80&w=1600&auto=format&fit=crop",
		waste_and_knots:
			"https://images.unsplash.com/photo-1633594308237-3dcfa56b4e69?q=80&w=1600&auto=format&fit=crop",
	},
}

/**
 |
 | The covers of the sessions written out longhand above, picked for their
 | subject rather than dealt.
 |
 | The eight of them are the only sessions in this seed that say anything, so
 | they are the only ones where a picture can be matched to what is said. The
 | rest take whatever their category deals them.
 |
 | `Living with the Land` is the one pairing the static site makes itself: the
 | session of that name there carries this photograph, and the standfirst here
 | is about the same native cotton.
 |
 */
const COVERS_BY_NAME = {
	block_printing: responsive_image( { url: COVERS.Workshop.natural_dye } ),
	cooling_pergola: responsive_image( {
		url: COVERS.Experience.sacred_groves,
	} ),
	designing_for_heat: responsive_image( {
		url: COVERS.Conversation.air_quality,
	} ),
	living_with_the_land: responsive_image( {
		url: COVERS.Showcase.native_cotton,
	} ),
	notes_for_2027: responsive_image( {
		url: COVERS.Conversation.living_infrastructure,
	} ),
	repairing_what_you_own: responsive_image( {
		url: COVERS.Workshop.upcycling,
	} ),
	still_being_written: responsive_image( {
		url: COVERS.Showcase.eco_typography,
	} ),
	unannounced: responsive_image( { url: COVERS.Showcase.flow } ),
}

/**
 |
 | The nth cover of a category, wrapping when that category's pool runs out.
 |
 | Dealt by position rather than chosen by name, so that a session added to the
 | programme below takes the next picture instead of needing one picked for it.
 |
 */
function cover_for ( category: string, position: number ) {
	const pool = Object.values(
		COVERS[category as keyof typeof COVERS] ?? COVERS.Showcase,
	)

	return responsive_image( { url: pool[position % pool.length] } )
}

/**
 |
 | The Instagram strip's slides, and the About page's carousel's.
 |
 | The static site's own strip, in its own order and to the last picture. It
 | is drawn from Unsplash rather than from Instagram, and so is this: the
 | component does not call Instagram, and the pictures are whatever an editor
 | adds.
 |
 | The two components hold the same attributes and render nothing like each
 | other, so seeding both from one list is the clearest way to show that the
 | difference is in the rendering rather than in the content.
 |
 */
const INSTAGRAM_SLIDES = [
	{
		image:
			"https://images.unsplash.com/photo-1763365716252-b34f6e500bdc?q=80&w=720&auto=format&fit=crop",
		label: "Opening night",
		url: "https://www.instagram.com/godrejdesignlab",
	},
	{
		image:
			"https://images.unsplash.com/photo-1777303799010-d062e096c5ff?q=80&w=720&auto=format&fit=crop",
		label: "A workshop in progress",
		url: "https://www.instagram.com/godrejdesignlab",
	},
	{
		image:
			"https://images.unsplash.com/photo-1777353245243-831faded69f8?q=80&w=720&auto=format&fit=crop",
		label: "Building the pergola",
		url: "https://www.instagram.com/godrejdesignlab",
	},
	{
		image:
			"https://images.unsplash.com/photo-1764351661280-bda9c2a653ff?q=80&w=720&auto=format&fit=crop",
		label: "The conversation stage",
		url: "https://www.instagram.com/godrejdesignlab",
	},
	{
		image:
			"https://images.unsplash.com/photo-1776684012353-787d693dda8f?q=80&w=720&auto=format&fit=crop",
		label: "Closing the last day",
		url: "https://www.instagram.com/godrejdesignlab",
	},
	{
		image:
			"https://images.unsplash.com/photo-1770355302457-10d2b94c2220?q=80&w=720&auto=format&fit=crop",
		label: "Tracing the buried river",
		url: "https://www.instagram.com/godrejdesignlab",
	},
]

/**
 |
 | The sponsors' logos, taken from the static site's own strip.
 |
 | Every one of them is a placeholder brand rather than a real sponsor of this
 | event, which is the point: the strip is long enough to loop, the logos vary
 | enough in shape and background to show what the grey-until-pointed-at
 | treatment does to each, and nobody can mistake the list for a signed-off one.
 |
 | The static site's copy carries a per-logo style alongside each url — a blend
 | mode, and a hairline scale on a few of them to hide an anti-aliasing seam.
 | Neither travels: the sponsor component holds a name and a picture, the blend
 | mode belongs to every logo and is applied once in the block, and a per-entry
 | presentational style is not a thing an editor should be able to set.
 |
 */
const SPONSORS = [
	{
		name: "HBO",
		url: "https://blogadmin.vpsvc.com/hub/wp-content/uploads/sites/14/2016/08/hbo.png",
	},
	{
		name: "LEGO",
		url: "https://res.cloudinary.com/vistaprint/images/v1753257304/ideas-and-advice-prod/blogadmin/lego-logo_38167ed5cb/lego-logo_38167ed5cb.jpg",
	},
	{
		name: "BBC",
		url: "https://res.cloudinary.com/vistaprint/images/w_2048,h_560,c_scale/f_auto,q_auto/v1719942384/ideas-and-advice-prod/blogadmin/bbc-logo/bbc-logo.png",
	},
	{
		name: "Laika",
		url: "https://upload.wikimedia.org/wikipedia/commons/5/58/Laika_logo.svg",
	},
	{
		name: "Adidas",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1705580343/ideas-and-advice-prod/en-us/adidas/adidas.png",
	},
	{
		name: "McDonald's",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1719942371/ideas-and-advice-prod/blogadmin/mc-donald-logo/mc-donald-logo.jpg",
	},
	{
		name: "KFC",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1705580332/ideas-and-advice-prod/en-us/kfc/kfc.png",
	},
	{
		name: "Lacoste",
		url: "https://res.cloudinary.com/vistaprint/images/w_1024,h_493,c_scale/v1753257357/ideas-and-advice-prod/blogadmin/lacoste-logo/lacoste-logo.jpg",
	},
	{
		name: "Burger Kings",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1705580319/ideas-and-advice-prod/en-us/burger-king/burger-king.png",
	},
	{
		name: "Starbucks",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1705580310/ideas-and-advice-prod/en-us/starbucks_142223edc2a/starbucks_142223edc2a.png",
	},
	{
		name: "Harley-Davidson",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1705580316/ideas-and-advice-prod/en-us/harley_14220823ac2/harley_14220823ac2.png",
	},
	{
		name: "Visa",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1705580321/ideas-and-advice-prod/en-us/visa/visa.png",
	},
	{
		name: "Coca Cola",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1706089184/ideas-and-advice-prod/en-us/Coca-Cola_logo.svg_/Coca-Cola_logo.svg_.png",
	},
	{
		name: "Google",
		url: "https://res.cloudinary.com/vistaprint/images/w_1024,h_347,c_scale/v1753257211/ideas-and-advice-prod/blogadmin/google-logo/google-logo.jpg",
	},
	{
		name: "Twitter",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1705580322/ideas-and-advice-prod/en-us/twitter/twitter.png",
	},
	{
		name: "Chanel",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1719942393/ideas-and-advice-prod/blogadmin/logo-chanel/logo-chanel.png",
	},
	{
		name: "Harvard",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1705580314/ideas-and-advice-prod/en-us/harvard/harvard.png",
	},
	{
		name: "Shell",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1719942431/ideas-and-advice-prod/blogadmin/shell-logo/shell-logo.png",
	},
	{
		name: "NASA",
		url: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
	},
	{
		name: "London Underground",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1719942421/ideas-and-advice-prod/blogadmin/underground-logo/underground-logo.png",
	},
	{
		name: "PlayStation",
		url: "https://res.cloudinary.com/vistaprint/images/w_2048,h_1559,c_scale/f_auto,q_auto/v1719942436/ideas-and-advice-prod/blogadmin/playstation-logo/playstation-logo.png",
	},
	{
		name: "Barbie",
		url: "https://res.cloudinary.com/vistaprint/images/w_2048,h_1014,c_scale/f_auto,q_auto/v1719942380/ideas-and-advice-prod/blogadmin/barbie-logo/barbie-logo.png",
	},
	{
		name: "National Geographic",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1719942404/ideas-and-advice-prod/blogadmin/national-geographic-logo/national-geographic-logo.png",
	},
	{
		name: "Federal Express",
		url: "https://res.cloudinary.com/vistaprint/images/w_2048,h_573,c_scale/f_auto,q_auto/v1719942389/ideas-and-advice-prod/blogadmin/fedex-logo/fedex-logo.png",
	},
	{
		name: "Mastercard",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1719961008/ideas-and-advice-prod/blogadmin/mastercard-logo-1/mastercard-logo-1.png",
	},
	{
		name: "Formula 1",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1719942441/ideas-and-advice-prod/blogadmin/formula-uno-modern-logo/formula-uno-modern-logo.png",
	},
	{
		name: "MTV",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1719942401/ideas-and-advice-prod/blogadmin/mtv-logo/mtv-logo.png",
	},
	{
		name: "Uniqlo",
		url: "https://res.cloudinary.com/vistaprint/images/f_auto,q_auto/v1706192386/ideas-and-advice-prod/blogadmin/Screenshot-2024-01-25-at-15.19.29/Screenshot-2024-01-25-at-15.19.29.png",
	},
	{
		name: "Vans",
		url: "https://res.cloudinary.com/vistaprint/images/w_1024,h_414,c_scale/v1753257351/ideas-and-advice-prod/blogadmin/vans-logo/vans-logo.jpg",
	},
]

const TEAM = [
	{
		description:
			"Leads the Lab's programming, and has been the thread running through every year since the first.",
		image: IMAGES.portrait_one,
		name: "Nandini Rao",
		role: "Programme lead",
	},
	{
		description:
			"Looks after the fellows, from the first conversation to the last day of the event.",
		image: IMAGES.portrait_two,
		name: "Arjun Menon",
		role: "Fellowship lead",
	},
]

/* _____
 | The catalogue.
 |
 | Every helper below writes one component of the catalogue, in the shape the
 | document service wants it. Images are written as bare urls rather than as
 | uploaded files: the image component carries a `url` beside its `file`
 | precisely so that no picture has to be stored in this repository.
 |
 */

type Image_Fields = {
	url: string
	title?: string
	caption?: string
	alt?: string
}

function image ( { alt = "", caption, title, url }: Image_Fields ) {
	return { alt, caption, title, url }
}

/**
 |
 | The same picture at all three widths.
 |
 | Art direction is the exception rather than the rule, and the website falls
 | back from any missing width to the nearest one that was filled in — so a
 | responsive image with one crop is a legitimate shape and the one the seed
 | writes.
 |
 */
function responsive_image ( fields: Image_Fields ) {
	return { small: image( fields ) }
}

/**
 |
 | The other shape a responsive image comes in: a different crop at each of the
 | three widths.
 |
 | The exception rather than the rule, and seeded once, because a responsive
 | image with one crop and a responsive image with three go down different
 | branches of the website's fallback — and a component only ever seeded with
 | one crop would leave the branch that art direction exists for untested.
 |
 | The words belong to the picture rather than to the crop, so all three carry
 | the same ones. The website reads them off the small crop, which is the one it
 | never hides.
 |
 */
function art_directed_image (
	{ alt, caption, large, medium, small, title }:
		& Omit<Image_Fields, "url">
		& { small: string; medium: string; large: string },
) {
	const words = { alt, caption, title }

	return {
		large: image( { ...words, url: large } ),
		medium: image( { ...words, url: medium } ),
		small: image( { ...words, url: small } ),
	}
}

/**
 |
 | The image component as a block in its own right, rather than as an attribute
 | of a composite.
 |
 */
function image_block ( fields: Image_Fields ) {
	return { __component: "media.image-v1", ...image( fields ) }
}

function responsive_image_block (
	fields: Parameters<typeof art_directed_image>[0],
) {
	return {
		__component: "media.responsive-image-v1",
		...art_directed_image( fields ),
	}
}

function image_link ( url: string, label: string, image_url: string ) {
	return {
		image: responsive_image( { alt: label, url: image_url } ),
		label,
		url,
	}
}

function wysiwyg ( paragraphs: string[] ) {
	return {
		__component: "text.wysiwyg-v1",
		rich_text: paragraphs.map( ( paragraph ) => ( {
			children: [ { text: paragraph, type: "text" } ],
			type: "paragraph",
		} ) ),
	}
}

function quote ( quote_text: string, attribution: string, image_url?: string ) {
	return {
		__component: "text.quote-v1",
		attribution,
		quote: quote_text,
		...( image_url ? { image: image( { url: image_url } ) } : {} ),
	}
}

function marquee ( items: string[] ) {
	return {
		__component: "text.marquee-v1",
		items: items.map( ( content ) => ( { content } ) ),
	}
}

function gallery ( layout: "equal" | "wide-first", images: Image_Fields[] ) {
	return {
		__component: "media.gallery-v1",
		images: images.map( image ),
		layout,
	}
}

function google_map (
	{ address, image_url, label, map_url }: {
		address: string
		map_url: string
		label?: string
		image_url?: string
	},
) {
	return {
		address,
		label,
		map_url,
		...( image_url
			? {
				image: responsive_image( {
					alt: "Location map",
					url: image_url,
				} ),
			}
			: {} ),
	}
}

/* _____
 | Listings.
 |
 | Three components and, between them, both ways a listing is filled. A session
 | listing holds a category and a count and nothing else — the CMS fills it from
 | the page's event when the page is asked for. A session list is curated, and
 | so is a contributor listing that is given anybody; a contributor listing left
 | empty fills itself the same way a session listing does.
 |
 | Every branch of that is seeded, because the failure this arrangement can have
 | is a listing that arrives empty, and an empty listing looks exactly like a
 | listing nobody has filled in yet.
 |
 */

function session_listing ( category: string, count: number ) {
	return { __component: "list.session-listing-v1", category, count }
}

/**
 |
 | The category listing pages' listing. A category and nothing else: there is no
 | count, because the page shows every session of the category and the visitor
 | narrows it down themselves.
 |
 */
function session_listing_with_filtration ( category: string ) {
	return {
		__component: "list.session-listing-with-filtration-v1",
		category,
	}
}

/**
 |
 | The schedule page's list. **It stores nothing**: which sessions it holds and
 | which document it links to both follow from the event the page resolved to.
 |
 */
function session_schedule_list () {
	return { __component: "list.session-schedule-list-v1" }
}

function session_list ( sessions: any[] ) {
	return {
		__component: "list.session-list-v1",
		sessions: sessions.map( ( session ) => session.documentId ),
	}
}

function contributor_listing (
	layout: "natural" | "carousel" | "grid",
	count: number,
	curated: any[] = [],
) {
	return {
		__component: "list.contributor-listing-v1",
		contributors: curated.map( ( person ) => person.documentId ),
		count,
		layout,
	}
}

function link (
	label: string,
	url: string,
	style: "plain" | "button" = "plain",
) {
	return { label, style, url }
}

function plain_string ( content: string ) {
	return { __component: "text.plain-string-v1", content }
}

type Level = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

/**
 |
 | A heading as an ordinary component attribute — a section's own heading. It
 | carries no `__component`, because it is not a choice an editor made from a
 | dynamic zone.
 |
 */
function heading_component (
	content: string,
	level: Level,
	register_with_toc = false,
) {
	return { content, level, register_with_toc }
}

/**
 |
 | The same component as an entry in a dynamic zone, where the discriminator is
 | what tells Strapi which component was chosen.
 |
 */
function heading ( content: string, level: Level, register_with_toc = false ) {
	return {
		__component: "text.heading-v1",
		...heading_component( content, level, register_with_toc ),
	}
}

function section (
	title: string,
	{
		background_gradient,
		background_pattern,
		background_position,
		blocks = [] as any[],
		heading: section_heading,
		horizontal_rule,
		link: section_link,
		opening_line,
		register_with_toc = false,
		strings = [] as string[],
	}: {
		background_gradient?: string
		background_pattern?: string
		background_position?: string
		/** Catalogue components, after whatever `strings` contributed. */
		blocks?: any[]
		heading?: ReturnType<typeof heading_component>
		horizontal_rule?: boolean
		link?: ReturnType<typeof link>
		opening_line?: string
		register_with_toc?: boolean
		strings?: string[]
	},
) {
	return {
		__component: "container.section-v1",
		content: [ ...strings.map( plain_string ), ...blocks ],
		// Present-but-undefined is not the same as absent here: the document
		// service reads the key, builds an empty heading component from it, and
		// then refuses the whole entry because that component's required
		// `content` is null.
		...( section_heading ? { heading: section_heading } : {} ),
		...( section_link ? { link: section_link } : {} ),
		...( background_gradient ? { background_gradient } : {} ),
		...( background_pattern ? { background_pattern } : {} ),
		...( background_position ? { background_position } : {} ),
		...( horizontal_rule === undefined ? {} : { horizontal_rule } ),
		...( opening_line ? { opening_line } : {} ),
		register_with_toc,
		title,
	}
}
