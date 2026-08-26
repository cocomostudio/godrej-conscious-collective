
/**
 |
 | Pictures, and the people in them.
 |
 | The sample content's own media library — every address the seed writes,
 | gathered in one file so that a picture can be swapped without opening a
 | content-type file, and so that the same photograph reaching two places is
 | visibly the same photograph.
 |
 | Every url points somewhere else. **No image is stored in this repository** —
 | the image component carries a `url` beside its `file` for exactly this, and
 | the seed uses it so that a fresh clone needs no binary assets and no upload
 | step to have a page worth looking at.
 |
 */

import { type Slide, responsive_image } from "./components.ts"
import type { Archive_Entry } from "./listings.ts"

export const IMAGES = {
	// Three crops of one photograph, for the responsive image: tall on a
	// phone, landscape from the medium breakpoint, and letterboxed from the
	// large one. Art direction rather than resolution — the same picture,
	// framed for the shape of the space it lands in. Anything cropped this way
	// has to be one subject at three widths, which is why all three carry the
	// same photograph's id and differ only in the box asked for.
	promo_small:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/above-the-fold__small.jpg",
	promo_medium:
		"https://media.cocomo.199101991.xyz/2025/godrej-design-lab/above-the-fold__large.png",
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
export const COVERS_BY_NAME = {
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
export function cover_for ( category: string, position: number ) {
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
export const INSTAGRAM_SLIDES: Slide[] = [
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
export const SPONSORS = [
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

export const TEAM = [
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
 | The Archive — five past editions, and the six the home page's ring turns
 | through.
 |
 | Both lists are the static site's own, kept as they are found there,
 | **including the fact that the two disagree**: the timeline holds five
 | editions and the ring holds six, and only the ring knows about 2019. That is
 | not a mistake to tidy up here. Each of the two is content an editor fills in
 | separately, and a seed that quietly reconciled them would be asserting a
 | relationship between the two components that neither of them has.
 |
 */

export const ARCHIVE_ENTRIES: Archive_Entry[] = [
	{
		description:
			"Designers, architects, artists, and thinkers explored innovative "
			+ "approaches to building and living more responsibly, blending "
			+ "creativity with environmental awareness. Through dialogue, "
			+ "experimentation, and shared experiences, the event highlighted "
			+ "how thoughtful design can shape a more sustainable future.",
		featured_images: [
			"https://images.unsplash.com/photo-1770355302457-10d2b94c2220?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1763365716252-b34f6e500bdc?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1764351661280-bda9c2a653ff?q=80&w=720&auto=format&fit=crop",
		],
		name: "Reclaiming Cool",
		year: "2025",
	},
	{
		description:
			"Makers and researchers turned to living materials — mycelium, "
			+ "algae, bamboo, and bio-based textiles — as alternatives to "
			+ "extraction and synthesis. Workshops and prototypes asked what "
			+ "changes when a material is cultivated rather than manufactured.",
		featured_images: [
			"https://images.unsplash.com/photo-1776684012353-787d693dda8f?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1486718448742-163732cd1544?q=80&w=720&auto=format&fit=crop",
		],
		name: "Grown, Not Made",
		year: "2024",
	},
	{
		description:
			"A programme built around reuse, repair, and the quiet value of "
			+ "what already exists. Architects, furniture makers, and clothing "
			+ "designers shared salvage-led projects and made the case for "
			+ "keeping materials in circulation instead of starting over.",
		featured_images: [
			"https://images.unsplash.com/photo-1525286335722-c30c6b5df541?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1777303799010-d062e096c5ff?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1522517779552-6cf4c1f31ee3?q=80&w=720&auto=format&fit=crop",
		],
		name: "Second Lives",
		year: "2023",
	},
	{
		description:
			"Textiles, membranes, and lightweight assemblies took centre "
			+ "stage, from adaptive interiors to garments designed for "
			+ "disassembly. The gathering explored how flexibility and "
			+ "lightness can reduce material load without giving up comfort "
			+ "or beauty.",
		featured_images: [
			"https://images.unsplash.com/photo-1483366774565-c783b9f70e2c?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1489058535093-8f530d789c3b?q=80&w=720&auto=format&fit=crop",
		],
		name: "Soft Structures",
		year: "2022",
	},
	{
		description:
			"Conversations centred on transparency: where materials come "
			+ "from, who makes them, and what they cost beyond price. "
			+ "Designers, sourcing specialists, and researchers examined how "
			+ "openness about supply chains changes the things we build and "
			+ "wear.",
		featured_images: [
			"https://images.unsplash.com/photo-1777353245243-831faded69f8?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1520587393050-c5298e1a8486?q=80&w=720&auto=format&fit=crop",
			"https://images.unsplash.com/photo-1567943183748-3a7542120c90?q=80&w=720&auto=format&fit=crop",
		],
		name: "Material Honesty",
		year: "2021",
	},
]

/**
 |
 | The home page's ring. Every slide links to the Archives page, because that
 | is where a past edition is actually read — the ring is an invitation rather
 | than a destination.
 |
 */
export const ARCHIVE_SLIDES: Slide[] = [
	{
		image:
			"https://images.unsplash.com/photo-1770355302457-10d2b94c2220?q=80&w=1600&auto=format&fit=crop",
		label: "Conscious Collective 2025",
		url: "/archives",
	},
	{
		image:
			"https://images.unsplash.com/photo-1776684012353-787d693dda8f?q=80&w=1600&auto=format&fit=crop",
		label: "Conscious Collective 2024",
		url: "/archives",
	},
	{
		image:
			"https://images.unsplash.com/photo-1525286335722-c30c6b5df541?q=80&w=1600&auto=format&fit=crop",
		label: "Conscious Collective 2023",
		url: "/archives",
	},
	{
		image:
			"https://images.unsplash.com/photo-1483366774565-c783b9f70e2c?q=80&w=1600&auto=format&fit=crop",
		label: "Conscious Collective 2022",
		url: "/archives",
	},
	{
		image:
			"https://images.unsplash.com/photo-1777353245243-831faded69f8?q=80&w=1600&auto=format&fit=crop",
		label: "Conscious Collective 2021",
		url: "/archives",
	},
	{
		image:
			"https://images.unsplash.com/photo-1576437148148-65bda16ad7fc?q=80&w=1600&auto=format&fit=crop",
		label: "Conscious Collective 2019",
		url: "/archives",
	},
]
