
import type React from "react"

export function X_Mark ( { className, ...props }: React.ComponentProps<"svg"> ) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		className={ className }
		{ ...props }>
		<path
			d="M7 17L17 7"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round" />
		<path
			d="M7 7L17 17"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round" />
	</svg>
}

export default X_Mark
