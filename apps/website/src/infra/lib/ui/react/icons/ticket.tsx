
import type React from "react"

export function Ticket ( { className, ...props }: React.ComponentProps<"svg"> ) {
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
			height="10"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round" />
		<circle
			cx="8"
			cy="8"
			r="2"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round" />
		<circle cx="14" cy="4" r="1" fill="currentColor" />
		<circle cx="2" cy="4" r="1" fill="currentColor" />
		<circle cx="14" cy="12" r="1" fill="currentColor" />
		<circle cx="2" cy="12" r="1" fill="currentColor" />
	</svg>
}

export default Ticket
