
import type { Route } from "./+types/home.route.ts"

export function meta ( { loaderData }: Route.MetaArgs ) {
	return [
		{ title: loaderData.title },
	]
}

export function loader () {
	return {
		title: "Godrej Conscious Collective",
	}
}

export default function Home ( { loaderData }: Route.ComponentProps ) {
	return <main className="cc mx-auto py-16">
		<h1 className="text-h1 text-black">{ loaderData.title }</h1>
		<p className="text-p mt-4 text-black">The website boots.</p>
	</main>
}
