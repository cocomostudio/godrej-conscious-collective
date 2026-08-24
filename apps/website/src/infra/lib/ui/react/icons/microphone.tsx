
import type React from "react"

export function Microphone (
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
			x="6"
			y="1"
			width="4"
			height="8"
			rx="2"
			stroke="currentColor"
			strokeWidth="1.5" />
		<path
			d="M13 7C13 9.76142 10.7614 12 8 12C5.23858 12 3 9.76142 3 7"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M8 12V15"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M5 15H11"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
	</svg>
}

export default Microphone
