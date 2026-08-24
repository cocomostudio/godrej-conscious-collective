
import type React from "react"

export function Location_Pin (
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
			fillRule="evenodd"
			clipRule="evenodd"
			d="M3.75726 2.68968C6.10033 0.43673 9.89955 0.436816 12.2427 2.68968C14.5858 4.94267 14.5858 8.59575 12.2427 10.8487L8.73931 14.69C8.34275 15.1248 7.65831 15.1249 7.26169 14.6901L3.75726 10.8487C1.41429 8.59574 1.4142 4.94263 3.75726 2.68968ZM8.00055 4.46212C6.67509 4.46212 5.60059 5.49529 5.60059 6.76978C5.60084 8.04406 6.67524 9.07744 8.00055 9.07744C9.32565 9.0772 10.4003 8.04392 10.4005 6.76978C10.4005 5.49544 9.32581 4.46235 8.00055 4.46212Z"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round" />
	</svg>
}

export default Location_Pin
