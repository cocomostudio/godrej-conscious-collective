
import type React from "react"

export function Chevron_Right (
	{ className, ...props }: React.ComponentProps<"svg">,
) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="8"
		height="16"
		viewBox="0 0 8 16"
		fill="none"
		className={ className }
		{ ...props }>
		<path
			d="M2 12L6 8L2 4"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
	</svg>
}

export default Chevron_Right
