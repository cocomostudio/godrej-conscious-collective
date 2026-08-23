
import type React from "react"

export function Arrow_Right (
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
		<path
			d="M1 8H15"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M10 3L15 8L10 13"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
	</svg>
}

export default Arrow_Right
