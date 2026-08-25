
import type React from "react"

export function Warning_Sign (
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
			d="M6.5462 2.8911L2.19161 11.4419C2.06566 11.6893 2 11.9629 2 12.2404C2 13.2122 2.78779 14 3.75958 14H12.2404C13.2122 14 14 13.2122 14 12.2404C14 11.9629 13.9343 11.6893 13.8084 11.4419L9.4538 2.8911C9.17534 2.34431 8.61362 2 8 2C7.38638 2 6.82466 2.34431 6.5462 2.8911Z"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<path
			d="M8 6V9"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round" />
		<circle cx="8" cy="11" r="1" fill="currentColor" />
	</svg>
}

export default Warning_Sign
