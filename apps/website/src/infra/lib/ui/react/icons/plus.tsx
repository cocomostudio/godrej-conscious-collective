
import type React from "react"

export function Plus ( { className, ...props }: React.ComponentProps<"svg"> ) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		className={ className }
		{ ...props }>
		<path
			d="M5 12H19"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round" />
		<path
			d="M12 19V5"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round" />
	</svg>
}

export default Plus
