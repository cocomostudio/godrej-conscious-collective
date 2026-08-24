
import type React from "react"

export function User ( { className, ...props }: React.ComponentProps<"svg"> ) {
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
			cy="4"
			r="3"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round" />
		<path
			d="M14 15C14 11.6863 11.3137 9 8 9C4.68629 9 2 11.6863 2 15"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round" />
	</svg>
}

export default User
