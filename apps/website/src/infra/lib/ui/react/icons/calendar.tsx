
import type React from "react"

export function Calendar (
	{ className, ...props }: React.ComponentProps<"svg">,
) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="none"
		className={ className }
		{ ...props }>
		<rect
			x="1"
			y="3"
			width="14"
			height="12"
			rx="1"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round" />
		<path
			d="M6 1V5"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M10 1V5"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M6 8V9"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M10 8V9"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M6 11V12"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M10 11V12"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
	</svg>
}

export default Calendar
