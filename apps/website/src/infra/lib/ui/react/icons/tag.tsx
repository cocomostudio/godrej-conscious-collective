
import type React from "react"

export function Tag ( { className, ...props }: React.ComponentProps<"svg"> ) {
	return <svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="none"
		className={ className }
		{ ...props }>
		<path
			d="M1.29289 8.29289L7.29289 14.2929C7.68342 14.6834 8.31658 14.6834 8.70711 14.2929L14.2929 8.70711C14.6834 8.31658 14.6834 7.68342 14.2929 7.29289L8.29289 1.29289C8.10536 1.10536 7.851 1 7.58579 1H2C1.44772 1 1 1.44772 1 2V7.58579C1 7.851 1.10536 8.10536 1.29289 8.29289Z"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round" />
		<circle
			cx="5"
			cy="5"
			r="1"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round" />
	</svg>
}

export default Tag
