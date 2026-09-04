
/**
 |
 | The two page shells — the site chrome a page is drawn inside.
 |
 | A shell carries the navigation, the site title and description, the
 | registration form's slideshow and any injected code. Every page and every
 | session names one, and the primary shell is the default a new entry takes.
 | The archive shell exists so that a second one has a reader.
 |
 */

import { link } from "./lib/components.ts"
import type { Strapi } from "./lib/strapi.ts"
import { upload_slideshow } from "./lib/uploads.ts"

export type Seeded_Page_Shells = {
	archive: any
	primary: any
}

export async function write_page_shells (
	strapi: Strapi,
	/**
	 |
	 | Whether to fetch the slideshow's pictures. False from the CMS test
	 | harness — see `Seed_Options` in `content.ts`. A shell with no slideshow
	 | is a shape the frontend already has, because it is what an editor who
	 | uploads nothing gets.
	 |
	 */
	download_media = true,
): Promise<Seeded_Page_Shells> {
	const primary = await strapi.documents( "api::page-shell.page-shell" )
		.create( {
			data: {
				default: true,
				form_slideshow: download_media
					? await upload_slideshow( strapi )
					: [],
				name: "Primary",
				navigation_footer: [
					link(
						"godrejenterprises.com",
						"https://godrejenterprises.com/",
					),
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
					link( "Archive", "/archives" ),
					link( "About Us", "/about" ),
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
