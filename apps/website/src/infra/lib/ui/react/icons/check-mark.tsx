
import type React from "react"

export function Check_Mark (
	{ className, ...props }: React.ComponentProps<"svg">,
) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="8"
		height="8"
		viewBox="0 0 8 8"
		fill="none"
		className={ className }
		{ ...props }>
		<path
			d="M0.75 4.75006L2.75 6.75006L6.75 0.750061"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
	</svg>
}

export default Check_Mark
