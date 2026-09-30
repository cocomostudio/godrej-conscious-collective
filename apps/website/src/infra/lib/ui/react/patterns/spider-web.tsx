
/**
 |
 | A spider web, drawn as twelve nested strands.
 |
 | It draws in `currentColor`, so whoever places it picks its colour with a
 | text colour class. Each strand fades from full strength to 30% along its
 | length, over a faint outline in the same colour, and the whole web sits at
 | 10% opacity.
 |
 | Each strand's gradient needs an id that no other copy of the web on the same
 | page shares, because a page can hold several patterned sections.
 |
 */

import type React from "react"
import { useId } from "react"

const STRANDS = [
	{
		d: "M620 884c3 18-20 47-30 56-65 56-204-19-269-62A741 741 0 0 1 58 544S-61 265 45 34c0 0 178 23 266-33l416 280s-82 42-95 86c-12 44 16 78-42 82l-49-13 79 448Z",
		x1: 37.1,
		x2: 749.4,
		y1: 497.2,
		y2: 610,
	},
	{
		d: "M601 855c3 17-19 44-29 52-60 52-189-17-250-57A692 692 0 0 1 76 538S-34 278 64 62c0 0 167 22 249-30l388 261s-77 39-89 80c-11 41 15 72-39 76l-46-11 74 417Z",
		x1: 57.3,
		x2: 721.7,
		y1: 502.9,
		y2: 608.1,
	},
	{
		d: "M582 826c3 16-18 40-27 48-56 48-176-16-232-53A642 642 0 0 1 95 532S-7 290 84 90c0 0 154 21 231-28l359 243s-71 35-82 74c-10 38 14 67-36 71l-43-11 69 387Z",
		x1: 77.3,
		x2: 693.8,
		y1: 508.7,
		y2: 606.3,
	},
	{
		d: "M563 797c2 15-17 37-25 44-52 44-162-14-214-48a591 591 0 0 1-210-267s-94-223-10-407c0 0 142 18 212-26l332 223s-66 33-75 68 12 63-34 66l-39-10 63 357Z",
		x1: 97.5,
		x2: 666,
		y1: 514.4,
		y2: 604.4,
	},
	{
		d: "M544 768c2 14-16 34-23 40-48 41-148-12-196-44a542 542 0 0 1-192-244s-87-204-10-373c0 0 130 17 195-24l304 205s-60 30-69 62c-9 33 12 57-31 60l-36-9 58 328z",
		x1: 117.7,
		x2: 638.3,
		y1: 520.1,
		y2: 602.5,
	},
	{
		d: "M525 740c2 12-15 29-22 35-43 37-134-11-177-39a491 491 0 0 1-175-222s-78-185-8-339c0 0 118 16 177-21l276 186s-55 27-63 56c-8 30 10 52-29 55l-32-9 53 298Z",
		x1: 137.7,
		x2: 610.4,
		y1: 525.8,
		y2: 600.6,
	},
	{
		d: "M506 711c2 11-14 26-20 31-39 33-120-9-159-35a442 442 0 0 1-157-199s-70-167-7-304c0 0 106 14 159-20l247 167s-49 25-56 51c-7 27 10 47-25 49l-30-7z",
		x1: 157.9,
		x2: 582.6,
		y1: 531.5,
		y2: 598.7,
	},
	{
		d: "M487 682c1 9-13 22-18 27-35 29-106-8-141-30a392 392 0 0 1-139-177s-63-148-7-270c0 0 94 12 141-17l220 148s-43 22-50 45c-6 23 9 41-22 44l-26-7 42 237Z",
		x1: 178,
		x2: 554.9,
		y1: 537.2,
		y2: 596.9,
	},
	{
		d: "M468 653c1 8-12 19-16 23-30 26-93-6-123-26-53-35-94-91-121-154 0 0-55-129-6-236 0 0 82 11 123-15l192 130s-38 19-44 39c-6 21 8 36-20 38l-22-6 36 207z",
		x1: 198.2,
		x2: 527,
		y1: 542.9,
		y2: 595,
	},
	{
		d: "M448 624c2 7-10 16-14 19-25 22-78-4-104-21-45-30-80-78-103-132 0 0-47-110-5-201 0 0 70 9 105-13l164 110s-33 17-38 34 7 31-16 32l-20-5 32 177z",
		x1: 218.3,
		x2: 499.3,
		y1: 548.6,
		y2: 593.1,
	},
	{
		d: "M429 595c2 6-9 12-12 15-21 18-64-3-85-17-38-24-68-64-87-109 0 0-38-91-4-167 0 0 58 8 87-11l136 92s-26 14-31 28c-4 14 6 25-13 27l-16-4z",
		x1: 238.5,
		x2: 471.6,
		y1: 554.3,
		y2: 591.2,
	},
	{
		d: "M410 566c1 5-8 9-10 11-17 15-50-1-67-12q-46-31-69-87s-31-73-3-133c0 0 46 6 69-8l108 73s-21 10-24 22c-4 11 4 20-12 21l-12-3 20 116Z",
		x1: 258.6,
		x2: 443.7,
		y1: 560,
		y2: 589.4,
	},
]

export function Spider_Web (
	{ className, ...props }: React.ComponentProps<"svg">,
) {
	const id = useId()

	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="728.8"
		height="960.8"
		viewBox="0 0 728.8 960.8"
		fill="none"
		className={ className }
		{ ...props }>
		<defs>
			{ STRANDS.map( ( { x1, x2, y1, y2 }, index ) =>
				<linearGradient
					key={ index }
					id={ `${id}-strand-${index}` }
					x1={ x1 }
					x2={ x2 }
					y1={ y1 }
					y2={ y2 }
					gradientTransform="matrix(1 0 0 -1 0 1034)"
					gradientUnits="userSpaceOnUse">
					<stop offset="0" stopColor="currentColor" />
					<stop offset="1" stopColor="currentColor" stopOpacity=".3" />
				</linearGradient>
			) }
		</defs>
		<g opacity=".1">
			{ STRANDS.map( ( { d }, index ) =>
				<g key={ index }>
					<path
						d={ d }
						stroke={ `url(#${id}-strand-${index})` }
						strokeWidth="2"
						strokeMiterlimit="10" />
					<path
						d={ d }
						stroke="currentColor"
						strokeOpacity=".2"
						strokeWidth="2"
						strokeMiterlimit="10" />
				</g>
			) }
		</g>
	</svg>
}

export default Spider_Web
