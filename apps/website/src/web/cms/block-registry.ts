
/**
 |
 | Every block the website knows how to render.
 |
 | A component the CMS holds and this map does not is **not an error**. The
 | catalogue grows in the CMS before it grows here — that is the normal state of
 | this build — so the renderer leaves a gap on the page and says so in the
 | console rather than taking the page down.
 |
 | `regions` is declared only by a block with **more than one** region, because
 | the attribute-to-prop mapping is a property of the block rather than of the
 | schema. A block with one region names it `content` and receives it as
 | `children`, with no declaration and no rename.
 |
 */

import type { ComponentType } from "react"

import { Add_To_Calendar } from "./blocks/add-to-calendar.tsx"
import { Back_Link } from "./blocks/back-link.tsx"
import { Gallery } from "./blocks/gallery.tsx"
import { Google_Map } from "./blocks/google-map.tsx"
import { Heading } from "./blocks/heading.tsx"
import { Horizontal_Rule } from "./blocks/horizontal-rule.tsx"
import {
	HOOK_POSITIONS,
	HTML_DOCUMENT_HOOKS,
	Html_Document_Hooks,
} from "./blocks/html-document-hooks.tsx"
import { Image } from "./blocks/image.tsx"
import { Image_And_Content } from "./blocks/image-and-content.tsx"
import { Image_Link } from "./blocks/image-link.tsx"
import { Image_Stack_And_Content } from "./blocks/image-stack-and-content.tsx"
import { Instagram_Feed } from "./blocks/instagram-feed.tsx"
import { Link_Block } from "./blocks/link.tsx"
import { Map_And_Content } from "./blocks/map-and-content.tsx"
import { Marquee } from "./blocks/marquee.tsx"
import { Masthead } from "./blocks/masthead.tsx"
import { Plain_String } from "./blocks/plain-string.tsx"
import { Profile_List } from "./blocks/profile-list.tsx"
import { Quote } from "./blocks/quote.tsx"
import { Responsive_Image } from "./blocks/responsive-image.tsx"
import { Root } from "./blocks/root.tsx"
import { Script } from "./blocks/script.tsx"
import { Section } from "./blocks/section.tsx"
import { Session_Details } from "./blocks/session-details.tsx"
import { Sponsors_List } from "./blocks/sponsors-list.tsx"
import { Table_Of_Contents } from "./blocks/table-of-contents.tsx"
import { Vanilla_Carousel } from "./blocks/vanilla-carousel.tsx"
import { Wysiwyg } from "./blocks/wysiwyg.tsx"

import {
	ADD_TO_CALENDAR,
	BACK_LINK,
	MASTHEAD,
	ROOT,
	SESSION_DETAILS,
	TABLE_OF_CONTENTS,
} from "./assemble-root.ts"

type Registered = {
	Renderer: ComponentType<any>
	regions?: string[]
}

export const BLOCK_REGISTRY: Record<string, Registered> = {
	// Blocks with no component behind them, built by the website from an
	// entry's top-level attributes. The ContributorProfile will join these.
	[ROOT]: {
		Renderer: Root,
		regions: [
			"back_link",
			"masthead",
			"sidebar",
			"sidebar_repeat",
			"main",
		],
	},
	[BACK_LINK]: { Renderer: Back_Link },
	[TABLE_OF_CONTENTS]: { Renderer: Table_Of_Contents },
	[MASTHEAD]: { Renderer: Masthead },
	[SESSION_DETAILS]: { Renderer: Session_Details },
	[ADD_TO_CALENDAR]: { Renderer: Add_To_Calendar },

	// The catalogue.
	[HTML_DOCUMENT_HOOKS]: {
		Renderer: Html_Document_Hooks,
		regions: [ ...HOOK_POSITIONS ],
	},
	"code.script-v1": { Renderer: Script },
	"container.image-and-content-v1": { Renderer: Image_And_Content },
	"container.image-stack-and-content-v1": {
		Renderer: Image_Stack_And_Content,
	},
	"container.map-and-content-v1": { Renderer: Map_And_Content },
	"container.section-v1": { Renderer: Section },
	"list.profile-list-v1": { Renderer: Profile_List },
	"list.sponsors-list-v1": { Renderer: Sponsors_List },
	"media.gallery-v1": { Renderer: Gallery },
	"media.google-map-v1": { Renderer: Google_Map },
	"media.image-v1": { Renderer: Image },
	"media.instagram-feed-v1": { Renderer: Instagram_Feed },
	"media.responsive-image-v1": { Renderer: Responsive_Image },
	"media.vanilla-carousel-v1": { Renderer: Vanilla_Carousel },
	"miscellaneous.horizontal-rule-v1": { Renderer: Horizontal_Rule },
	"navigation.image-link-v1": { Renderer: Image_Link },
	"navigation.link-v1": { Renderer: Link_Block },
	"text.heading-v1": { Renderer: Heading },
	"text.marquee-v1": { Renderer: Marquee },
	"text.plain-string-v1": { Renderer: Plain_String },
	"text.quote-v1": { Renderer: Quote },
	"text.wysiwyg-v1": { Renderer: Wysiwyg },
}
