
/**
 |
 | The Privacy Policy.
 |
 | The page the site's footer has always linked to, and until now a placeholder
 | holding one sentence. The copy is the GCC site's, taken verbatim, and the
 | arrangement is the Legal Disclaimer's: two columns, so a visitor gets the
 | back link and a table of contents beside a long document.
 |
 | **It is also where the list treatment can be looked at.** It is the one page
 | in the seed that is mostly lists, so the nested card, the rhombus marker, a
 | numbered card and the flattening of a list nested too deep all have real
 | content to be seen against rather than only a test.
 |
 | The rules between its sections are the section's own attribute rather than a
 | `---` typed into a text block. That is what the attribute is for, and it is
 | drawn outside the section where the GCC page draws it — a `---` would land
 | inside, at the foot of the words.
 |
 | ─── THREE DELIBERATE DEPARTURES FROM THE GCC PAGE ──────────────────────────
 |
 |   • **Its opening heading is dropped.** On a two-column page the page's own
 |     title is already at the top of the sidebar, and the two would say the
 |     same thing twice.
 |
 |   • **The last nested list is numbered.** The purposes information may be
 |     processed for are an enumeration, and a numbered card is a treatment the
 |     catalogue draws and nothing in the seed otherwise reaches.
 |
 |   • **A nested list is indented one level further than it needs.** Nesting is
 |     supported one level deep and anything deeper is lifted back into the
 |     first, and that rule should be exercised by content somebody can open
 |     rather than only by a test. No words are changed to do it; one item is
 |     indented under the one above it.
 |
 | The GCC page marks its numbered sections at inconsistent HTML heading levels.
 | The inconsistency is ignored: here the element follows how deeply the heading
 | is nested and the level an editor picks is a size, so only the size is taken
 | across — `h3`, which is what that page draws them at.
 |
 */

import {
	heading,
	heading_component,
	section,
	wysiwyg,
	wysiwyg_from_markdown,
} from "../lib/components.ts"
import { create_entry } from "../lib/strapi.ts"
import type { Strapi } from "../lib/strapi.ts"
import type { Seeded_Page_Shells } from "../page-shells.ts"

/*
 | The opening, as three components rather than one passage.
 |
 | The GCC page's own opening heading is dropped: on a two-column page the
 | page's title already says it in the sidebar. What is left is two paragraphs
 | with an advisory between them, and the advisory is a heading on that page —
 | so it is one here too, at the size that page draws it.
 |
 | Three components rather than one text block, because that is what these three
 | things are. Markdown earns its place where a passage has structure inside it;
 | this section has none that the catalogue cannot say directly.
 |
 | **The two paragraphs are text blocks rather than plain strings**, and not by
 | preference. A plain string's `content` is a Strapi `string`, which is a
 | varchar(255), and both of these run to nearly four hundred characters — the
 | write is refused. Nothing in the seed had met that ceiling before, because
 | every plain string in it is a line rather than a paragraph. The text block
 | takes the same words, with no markdown involved.
 */

const OPENING =
	"At Conscious Collective (www.consciouscollective.in) (hereinafter referred to as “Godrej/We”), We take your privacy very seriously and are committed to protect your personal data. This Privacy Notice/Policy (hereinafter referred to as “Notice”) sets out the way in which We collect, use, disclose, transfer, and store your personal data when you use our website or other digital platforms."

const ADVISORY =
	"You are advised to carefully read this Notice before using this website."

const THIRD_PARTIES =
	"Please note that our website and other digital platforms may contain links to third party websites / digital platforms which are provided for your convenience. We are only responsible for the privacy practices and security of our own digital platforms. We recommend that you check the privacy and security policies and procedures of each and every other website / digital platform that you visit."

/**
 |
 | The long one: an outer list carrying two nested ones.
 |
 | The second is indented one level too far at "Which pop up or push messages…",
 | which is the over-nesting the website's flattening rule exists for. Nothing
 | else about either departs from the GCC page.
 |
 */
const COLLECTION = `
- Personal data is data that can be used to identify or contact a single person (including but not limited to name, address, e-mail address, user name, telephone number, age, date of birth, gender, educational qualifications, posts and any other content you submit to our sites, sensitive information such as information relating to your health life).
- All personal data that We collect about you will be recorded, used, and protected by us in accordance with applicable data protection legislation and this Notice. We may supplement the information that you provide with other information that We obtain from our dealings with you or which We receive from other organisations, for example, our sponsors and partners. Please note, if you choose not to provide us with the requested personal data, We will be unable to offer you our products or services.
- In broad terms, We use your personal data for the following purposes: (to be updated basis actual business purposes)
    - To administer and provide products and services you request or have expressed an interest in
    - To communicate with you in the event that any products or services you have requested are unavailable
    - For fraud screening and prevention purposes
    - For record keeping purposes
    - To carry out market research so that we can improve the products and services we offer
    - To track your activity on our digital platforms
    - To create an individual profile for you so that we can understand and respect your preferences
    - To personalise and improve your experience on our digital platforms
    - To personalise and/ tailor any communications that we may send you
    - For profiling purposes to enable us to personalise and/or tailor any marketing communications that you may consent to receive from us
- When we provide you with products or services, We may collect and store any personal data that you provide to us. We may, for example, keep a record of your name, address, delivery/billing address, email address, telephone number. We may also record details of any disability or health needs that you may have.
- When you sign up with us for an online account, register to receive marketing communications from us (and/or our sponsors and partners), fill in any of our forms (whether online or offline) or otherwise expressly provide us with your personal data, We may collect and store any personal data that you provide to us and may use it to personalise and improve your experience on our digital platforms, provide products and services you request from us, and carry out profiling and market research.
- When you interact with our digital platforms, We may also automatically collect the following information about your visit. This is primarily to help us better understand how you use our digital platforms to enable us create better content and more relevant communications: (to be updated basis actual business purposes)
    - How you have reached our digital platform and the internet protocol (IP) address you have used
    - Your browser type, versions and plug-ins, and your operating system
    - Information collected in any forms you complete or submit
    - What content you like or share
    - Which adverts you saw and responded to
        - Which pop up or push messages you might have seen and responded to
    - Your subscription status
    - Your journey through our digital platform, including which links you click on and any searches you made, how long you stayed on a page, and other page interaction information
- We may also infer your location including the country from the IP address you have used to access our digital platforms and We may analyse which marketing activity led to your taking specific action on our digital platforms (e.g. downloading the app).
- We do not save any data related to net banking, credit card, debit card, wallets etc of any of our customers.
`

/** One paragraph, and the shortest section of the document. */
const OFFERS = `
We want you to be the first to know about new products and services, and occasional offers from our partners. We may share these offers with you only with your prior consent. You can unsubscribe from receiving these offers by emailing us. Please note, if you choose not to receive this information, We will be unable to keep you informed of new services, products, events or special offers that may interest you and our ability to inform you of ticketing opportunities may be affected.
`

/**
 |
 | The last of the three, and the one carrying the numbered card.
 |
 | Its nested list is an enumeration of purposes, which is what a numbered list
 | is for — and it is the one place in the seed a nested ordered list is drawn.
 | The GCC page marks it with bullets; the words are untouched and only the
 | marker differs.
 |
 */
const PROCESSING = `
- We may process your personal information for legitimate interests, including providing you with services and for service improvement purposes.
- It may be deemed necessary to process personal information for the following (but not limited to) purposes of legitimate interests by us or our third parties such as:
    1. To deliver services in respect to requests raised by you.
    2. To ensure continued relationship with our customers, partners or suppliers.
    3. To prevent misuse or fraudulent activities on our platforms.
    4. To uphold performance of contracts to which the data subject is a part of.
    5. In interests deemed to protect the vital interest of the data subject .
    6. In order to maintain compliance with legal obligations to which Godrej is a subject.
- We takes special consideration to ensure that the legitimate processing of information do not override the fundamental rights and freedoms of the data subjects.
`

export async function write_privacy_policy_page (
	strapi: Strapi,
	page_shells: Seeded_Page_Shells,
) {
	await create_entry( strapi, "api::page.page", {
		main_region: [
			// The opening carries no heading component, so its table-of-contents
			// entry is the section's own title. Every other section here has
			// both, and the number belongs to the heading rather than to the
			// entry: the sidebar wants the shorter of the two.
			section( "Introduction", {
				blocks: [
					wysiwyg( [ OPENING ] ),
					heading( ADVISORY, "h6" ),
					wysiwyg( [ THIRD_PARTIES ] ),
				],
				register_with_toc: true,
			} ),
			// The rule belongs to the section rather than to the words inside
			// it, so it is the section's own attribute and not a `---` typed
			// into a text block. Every section but the first and the last
			// carries one, which is where the GCC page draws its two.
			section( "Collection and Use of Personal Data", {
				blocks: [ wysiwyg_from_markdown( COLLECTION ) ],
				heading: heading_component(
					"1. Collection and Use of Personal Data",
					"h3",
				),
				horizontal_rule: true,
				register_with_toc: true,
			} ),
			section( "Offers and Opportunities", {
				blocks: [ wysiwyg_from_markdown( OFFERS ) ],
				heading: heading_component(
					"2. Offers and Opportunities from Us and Our Partners",
					"h3",
				),
				horizontal_rule: true,
				register_with_toc: true,
			} ),
			section( "Legitimate Processing of Information", {
				blocks: [ wysiwyg_from_markdown( PROCESSING ) ],
				heading: heading_component(
					"3. Legitimate Processing of Information",
					"h3",
				),
				register_with_toc: true,
			} ),
		],
		// Stated rather than left to the default, as the Legal Disclaimer
		// states it: the back link and the table of contents are the point of
		// the arrangement on a document this long.
		page_layout: "two-column",
		page_shell: page_shells.primary.documentId,
		standfirst: "How we collect, use and protect your personal data.",
		title: "Privacy Policy",
	} )
}
