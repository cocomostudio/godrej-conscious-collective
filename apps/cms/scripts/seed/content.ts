
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

	const page_shells = await write_page_shells( strapi )
	await write_pages( strapi, page_shells )

	await grant_public_permissions( strapi )
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
				default: false,
				name: "Archive",
				navigation_header: [
					link( "Back to this year", "/" ),
				],
				site_description:
					"A past edition of Godrej Conscious Collective.",
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
		standfirst: "Installations and concept designs across the festival.",
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
					"A record of the 2023 edition.",
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
		heading: section_heading,
		register_with_toc = false,
		strings = [] as string[],
	}: {
		heading?: ReturnType<typeof heading_component>
		register_with_toc?: boolean
		strings?: string[]
	},
) {
	return {
		__component: "container.section-v1",
		content: strings.map( plain_string ),
		// Present-but-undefined is not the same as absent here: the document
		// service reads the key, builds an empty heading component from it, and
		// then refuses the whole entry because that component's required
		// `content` is null.
		...( section_heading ? { heading: section_heading } : {} ),
		register_with_toc,
		title,
	}
}
