
import plugin from "tailwindcss/plugin"

/**
 * v3 only — delete when migrating to v4, where native `*:` / `**:` / `not-*`
 * supersede this and compose order-independently.
 *
 * Three families, one row per supported variant:
 *
 *   ── SELF ─────────────────────────────  the element matches on its own position
 *   first:                &:first-child                             (Tailwind)
 *   1st:                  &:first-child
 *   last:                 &:last-child                              (Tailwind)
 *   only:                 &:only-child                              (Tailwind)
 *   odd:                  &:nth-child( odd )                        (Tailwind)
 *   even:                 &:nth-child( even )                       (Tailwind)
 *   empty:                &:empty                                   (Tailwind)
 *   first-of-type:        &:first-of-type                           (Tailwind)
 *   last-of-type:         &:last-of-type                            (Tailwind)
 *   only-of-type:         &:only-of-type                            (Tailwind)
 *   not-first:            &:not( :first-child )
 *   not-1st:              &:not( :first-child )
 *   not-last:             &:not( :last-child )
 *   not-ends:             &:not( :first-child, :last-child )
 *
 *   ── DIRECT CHILDREN ──────────────────  the parent matches on its children
 *   *-first:              & > *:first-child
 *   *-1st:                & > *:first-child
 *   *-last:               & > *:last-child
 *   *-only:               & > *:only-child
 *   *-odd:                & > *:nth-child( odd )
 *   *-even:               & > *:nth-child( even )
 *   *-empty:              & > *:empty
 *   *-first-of-type:      & > *:first-of-type
 *   *-last-of-type:       & > *:last-of-type
 *   *-only-of-type:       & > *:only-of-type
 *   *-but-first:          & > *:not( :first-child )
 *   *-but-1st:            & > *:not( :first-child )
 *   *-but-last:           & > *:not( :last-child )
 *   *-but-ends:           & > *:not( :first-child, :last-child )
 *
 *   ── DESCENDANTS ──────────────────────  the ancestor matches on any descendant
 *   **-first:             & *:first-child
 *   **-1st:               & *:first-child
 *   **-last:              & *:last-child
 *   **-only:              & *:only-child
 *   **-odd:               & *:nth-child( odd )
 *   **-even:              & *:nth-child( even )
 *   **-empty:             & *:empty
 *   **-first-of-type:     & *:first-of-type
 *   **-last-of-type:      & *:last-of-type
 *   **-only-of-type:      & *:only-of-type
 *   **-but-first:         & *:not( :first-child )
 *   **-but-1st:           & *:not( :first-child )
 *   **-but-last:          & *:not( :last-child )
 *   **-but-ends:          & *:not( :first-child, :last-child )
 *
 *   ── COMBINATOR-ONLY FORMS ────────────  no self equivalent by construction
 *   *: / **:              & > *                    /  & *
 *   *-[5]:                & > *:nth-child( 5 )
 *   *-[2n+1]:             & > *:nth-child( 2n+1 )
 *   *-[.card]:            & > *.card
 *   *-[[data-open]]:      & > *[data-open]
 *   *-[:hover]:           & > *:hover
 *   *-[nth-of-type(2)]:   & > *:nth-of-type( 2 )
 *
 * Voice decides the family. `not-` is first person — "I am not the first" — and is
 * self only. `but-` is third person — "the children but the first" — and is
 * combinator only. Neutral names carry no prefix and appear on all three.
 */

/** Valid on all three families. name → pseudo-class fragment, minus the leading colon. */
const shared: Record<string, string> = {
	first: "first-child",
	"1st": "first-child", // alias for `first`
	last: "last-child",
	only: "only-child",
	odd: "nth-child( odd )",
	even: "nth-child( even )",
	empty: "empty",
	"first-of-type": "first-of-type",
	"last-of-type": "last-of-type",
	"only-of-type": "only-of-type",
}

/** Self only. Never reaches `*-` / `**-`. */
const self_only: Record<string, string> = {
	"not-first": "not( :first-child )",
	"not-1st": "not( :first-child )", // alias for `not-first`
	"not-last": "not( :last-child )",
	"not-ends": "not( :first-child, :last-child )", // needs 3+ siblings to match
}

/** Combinator only. Never registered as a bare `name:` variant. */
const combinator_only: Record<string, string> = {
	"but-first": "not( :first-child )",
	"but-1st": "not( :first-child )", // alias for `but-first`
	"but-last": "not( :last-child )",
	"but-ends": "not( :first-child, :last-child )", // needs 3+ siblings to match
}

/** Names v3 already ships as self-variants. Skipped so we never clobber a built-in. */
const builtin = new Set( [
	"first",
	"last",
	"only",
	"odd",
	"even",
	"empty",
	"first-of-type",
	"last-of-type",
	"only-of-type",
] )

/** What `*-` / `**-` accept. */
const combinator_named: Record<string, string> = {
	...shared,
	...combinator_only,
}

/** What a bare `name:` accepts. */
const self_named: Record<string, string> = { ...shared, ...self_only }

/** Maps a variant value to the selector fragment placed after the combinator. */
const target = ( v: string ): string => {
	if ( v === "*" ) {
		return "*" // bare *: / **:           → all
	}
	if ( /^[.#[]/.test( v ) ) {
		return `*${v}` // .foo #id [data-x]       → qualify element
	}
	if ( v.startsWith( ":" ) ) {
		return `*${v}` // already-colon pseudo
	}
	if ( /^[a-z-]+\(/.test( v ) ) {
		return `*:${v}` // nth-of-type(2), not(.x), is(.a,.b)
	}

	return combinator_named[v]
		? `*:${combinator_named[v]}`
		: `*:nth-child( ${v} )` // 5, 2n+1, -n+5
}

/** Bare (bracket-free) names users may type, derived so it can't drift. */
const values: Record<string, string> = {
	DEFAULT: "*",
	...Object.fromEntries(
		Object.keys( combinator_named ).map( ( name ) => [ name, name ] ),
	),
}

export const selectors_plugin = plugin( ( { matchVariant, addVariant } ) => {
	matchVariant( "*", ( v: string ) => `& > ${target( v )}`, { values } ) // direct children
	matchVariant( "**", ( v: string ) => `& ${target( v )}`, { values } ) // descendants

	for ( const [ name, frag ] of Object.entries( self_named ) ) {
		if ( builtin.has( name ) ) {
			continue // Tailwind already provides it
		}
		addVariant( name, `&:${frag}` )
	}
} )
