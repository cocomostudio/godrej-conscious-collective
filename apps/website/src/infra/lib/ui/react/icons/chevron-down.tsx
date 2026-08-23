
import type React from "react"

export function Chevron_Down (
	{ className, ...props }: React.ComponentProps<"svg">,
) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="12"
		height="16"
		viewBox="0 0 12 16"
		fill="none"
		className={ className }
		{ ...props }>
		<path
			d="M10 6L6 10L2 6"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
	</svg>
}

export default Chevron_Down
