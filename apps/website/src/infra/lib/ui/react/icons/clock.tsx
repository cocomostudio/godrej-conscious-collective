
import type React from "react"

export function Clock ( { className, ...props }: React.ComponentProps<"svg"> ) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="none"
		className={ className }
		{ ...props }>
		<circle
			cx="8"
			cy="8"
			r="7"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round" />
		<path
			d="M8 4.5V8L10.5 10.5"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
	</svg>
}

export default Clock
