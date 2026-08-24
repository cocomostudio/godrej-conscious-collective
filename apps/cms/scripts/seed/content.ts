
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

type Strapi = any

export async function write_seed_content ( strapi: Strapi ) {
	await write_url_patterns( strapi )

	const events = await write_events( strapi )
	const page_shells = await write_page_shells( strapi )
	await write_pages( strapi, page_shells, events )
	await write_sessions( strapi, page_shells, events )

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
			date_end: "2025-12-14",
			date_start: "2025-12-11",
			is_archived: false,
			main: true,
			name: "Conscious Collective 2025",
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
		},
	} )

	return { main, other }
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
}

async function write_page_shells ( strapi: Strapi ) {
	const primary = await strapi.documents( "api::page-shell.page-shell" )
		.create( {
			data: {
				default: true,
				name: "Primary",
				navigation_footer: [
					link( "Privacy Policy", "/privacy-policy" ),
					link( "Legal Disclaimer", "/legal-disclaimer" ),
					link(
						"Contact",
						"mailto:hello@consciouscollective.in",
					),
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
		standfirst: "Installations and concept designs across all four days.",
		title: "Showcases",
	},
	{
		standfirst: "Things to walk through, touch and take part in.",
		title: "Experiences",
	},
	{
		standfirst: "Talks and panels with the people making the work.",
		title: "Conversations",
	},
	{
		standfirst: "Hands-on sessions, with places to book.",
		title: "Workshops",
	},
	{
		standfirst: "Everything that is on, day by day.",
		title: "Schedule",
	},
	{
		standfirst: "The people taking part this year.",
		title: "Collaborators",
	},
	{
		standfirst: "How we collect, use and protect your personal data.",
		title: "Privacy Policy",
	},
]

async function write_pages (
	strapi: Strapi,
	page_shells: { archive: any; primary: any },
	events: { main: any; other: any },
) {
	// "Home" resolves to `/home`, and the website falls back to it when `/`
	// resolves to nothing. `/home` itself redirects permanently to `/`.
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
					"Installations, concept designs, workshops, conversations and more, across four days.",
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
						"11 - 14 Dec 2025",
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
		page_shell: page_shells.primary.documentId,
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

	// One column: the website renders no sidebar at all for these — no back
	// link, no table of contents, no side region.
	await create_page( strapi, {
		main_region: [
			section( "Legal Disclaimer", {
				heading: heading_component( "Legal Disclaimer", "h2" ),
				register_with_toc: true,
				strings: [
					"The contents of this website are for general information only and are subject to change without notice.",
				],
			} ),
		],
		page_layout: "one-column",
		page_shell: page_shells.primary.documentId,
		title: "Legal Disclaimer",
	} )

	// The rest of the route table.
	//
	// Every one of these is linked from the page shell's navigation, so
	// leaving them out would have the site chrome advertising seven URLs that
	// answer 404. They are thin on purpose: each becomes a real page when the
	// ticket that owns it arrives — the four category pages and the schedule
	// get their listings, the collaborators page gets its contributor listing.
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
) {
	const shell = page_shells.primary.documentId
	const main = events.main.documentId

	await create_session( strapi, {
		all_day_event: true,
		category: "Showcase",
		checkout_url: "https://example.com/cc/living-with-the-land",
		cover: responsive_image( {
			alt: "A Kondh house, half rebuilt",
			url: IMAGES.stack_two,
		} ),
		event: main,
		instances: instances_daily(
			"2025-12-11",
			"2025-12-14",
			"09:00",
			"22:00",
		),
		main_region: [
			section( "Living with the Land", {
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
	await create_session( strapi, {
		age_group: "Children",
		category: "Workshop",
		checkout_url: "https://example.com/cc/block-printing",
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
	await create_session( strapi, {
		category: "Conversation",
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
		event: main,
		instances: instances_daily(
			"2025-12-11",
			"2025-12-14",
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
		instances: [ instance( "2025-12-14", "10:00", "11:30" ) ],
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
		],
		name: "Repairing What You Own",
		page_shell: shell,
		price: 400,
		standfirst: "Bring one broken thing.",
	} )

	// Never published, so the published path provably does not serve it and
	// draft preview has a session to preview.
	await create_session( strapi, {
		category: "Showcase",
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

	// The rest of the programme. Thin, and deliberately so: what these are for
	// is filling the category listings and the schedule page, which are tickets
	// 08 and 09.
	for ( const filler of PROGRAMME ) {
		await create_session( strapi, {
			age_group: filler.age_group,
			category: filler.category,
			checkout_url: filler.checkout_url,
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
		day: "2025-12-14",
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
		day: "2025-12-14",
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
		day: "2025-12-14",
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
		day: "2025-12-14",
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
		day: "2025-12-14",
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
		day: "2025-12-14",
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
		day: "2025-12-14",
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
		day: "2025-12-14",
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
	gallery_one:
		"https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=720&auto=format&fit=crop",
	gallery_two:
		"https://images.unsplash.com/photo-1591299177061-2151e53fcaea?q=80&w=720&auto=format&fit=crop",
	portrait_one:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/cc-collaborator__01.png",
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

/**
 |
 | The Instagram strip's slides, and the About page's carousel's.
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
]

const SPONSORS = [
	{
		name: "Laika",
		url: "https://upload.wikimedia.org/wikipedia/commons/5/58/Laika_logo.svg",
	},
	{
		name: "NASA",
		url: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
	},
	{
		name: "Godrej Design Lab",
		url: "https://media.cocomo.199101991.xyz/2025/godrej-design-lab/cc-2024__01.png",
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
