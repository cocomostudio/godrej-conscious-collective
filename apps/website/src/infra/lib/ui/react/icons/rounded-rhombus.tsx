
import type React from "react"

export function Rounded_Rhombus (
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
			d="M3.41421 9.41421L6.58579 12.5858C7.36684 13.3668 8.63317 13.3668 9.41421 12.5858L12.5858 9.41421C13.3668 8.63316 13.3668 7.36683 12.5858 6.58579L9.41421 3.41421C8.63316 2.63316 7.36683 2.63317 6.58579 3.41421L3.41421 6.58579C2.63316 7.36684 2.63317 8.63317 3.41421 9.41421Z"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round" />
	</svg>
}

export default Rounded_Rhombus
