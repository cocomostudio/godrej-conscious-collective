
import type React from "react"

export function Download (
	{ className, ...props }: React.ComponentProps<"svg">,
) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="12"
		height="12"
		viewBox="0 0 12 12"
		fill="none"
		className={ className }
		{ ...props }>
		<path
			d="M9 4.5L6 7.5L3 4.5"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M6 7.5V0.75"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M0.75 6.75V11.25H11.25V6.75"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round" />
	</svg>
}

export default Download
