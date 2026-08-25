
/**
 |
 | How many are showing, and the two sentences that go with it.
 |
 | Both filtration listings say the same two things — a count at the head of the
 | list, and a line where nothing survived the filters — and they say them in
 | different sizes and colours. So the words are here and the classes are the
 | caller's: a change to how the site counts, or to how it says nothing matched,
 | is one edit rather than two that can disagree.
 |
 | **A session is an "Event" wherever the public reads it.** The static site
 | says "Entries" on a category page and "Events" on the schedule, which is the
 | same thing counted twice under two names; the glossary settles it.
 |
 */

export function Showing (
	{ className = "", count }: { className?: string; count: number },
) {
	return <p className={ className }>
		{ `${count} ${count === 1 ? "Event" : "Events"}` }
	</p>
}

export function No_Matches () {
	return <p className="mt-8 text-h4 text-black">
		No events match the filters you have chosen.
	</p>
}
