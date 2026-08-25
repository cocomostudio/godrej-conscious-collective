
/**
 |
 | What the filtration widget asks about, and where.
 |
 | **The facets differ by context, and by exactly one thing.** A category
 | listing page is already scoped to one category, so asking a visitor to pick a
 | category there is asking a question with one answer — the facet is dropped,
 | and it survives only on the schedule, which is the page that reads across all
 | four.
 |
 | The rest of the difference runs the other way and is the design's rather than
 | this rule's: the schedule is browsed by day through its own day tabs and
 | carries the category facet alone, while a category page carries the three
 | that narrow within a category.
 |
 | # The options come from the rows
 |
 | Every facet is built from what the CMS actually sent, in a canonical order,
 | rather than from a hardcoded list. Two reasons, and the first is the one that
 | forces it: **the days belong to the event.** A widget that named three days
 | in December would be wrong for the next edition, and the days a page can
 | offer are the days its own sessions run on.
 |
 | The second follows: a facet whose every option matches something is a facet
 | a visitor can trust. A page of workshops that are all ticketed does not offer
 | "Free Event" and then answer with nothing.
 |
 | They are built from the **loaded** rows rather than the filtered ones, so
 | they do not disappear as they are used.
 |
 */

import type {
	Age_Group,
	Category,
	Session_Card,
} from "../envelope.ts"
import type {
	Admission,
	Filters,
} from "./filter-sessions.ts"

import {
	AGE_GROUPS,
	CATEGORIES,
} from "../envelope.ts"
import { ordinal_day } from "../event-dates.ts"
import { age_group_label } from "../sessions.ts"
import {
	admission_of,
	ADMISSIONS,
	days_of,
} from "./filter-sessions.ts"

/**
 |
 | Which page the widget is on, which is the whole of what varies between the
 | two of them.
 |
 */
export type Filtration_Context = "category" | "schedule"

export type Facet_Name = keyof Filters

export type Option = {
	value: string
	label: string
	/**
	 |
	 | The category this option names, where it names one. The category facet
	 | draws a dot in that category's colour beside each label, which is the one
	 | thing any option carries beyond its words.
	 |
	 */
	category?: Category
}

export type Facet = {
	name: Facet_Name
	/** What the fieldset is called, and what its legend reads. */
	heading: string
	options: Option[]
}

/**
 |
 | The facets, in the order the design reads them, with the empty ones left
 | out.
 |
 | A facet with fewer than two options is empty for this purpose: a single
 | checkbox that every row already matches is a control that can only ever
 | narrow to what is already shown.
 |
 */
export function facets_for (
	context: Filtration_Context,
	sessions: Session_Card[],
): Facet[] {
	const built = context === "schedule"
		? [ categories_facet( sessions ) ]
		: [
			days_facet( sessions ),
			age_groups_facet( sessions ),
			admissions_facet( sessions ),
		]

	return built.filter( ( facet ) => facet.options.length > 1 )
}

/**
 |
 | The days, numbered as the schedule numbers them: "Day 1 (11th Dec)".
 |
 | Ascending, so the number and the date agree, and taken from every day every
 | loaded session runs on — a session across four days puts all four on the
 | list.
 |
 */
function days_facet ( sessions: Session_Card[] ): Facet {
	const days = [ ...new Set( sessions.flatMap( days_of ) ) ].sort()

	return {
		heading: "Dates",
		name: "days",
		options: days.map( ( day, index ) => ( {
			label: `Day ${index + 1} (${ordinal_day( day )})`,
			value: day,
		} ) ),
	}
}

/**
 |
 | Who a session is for, in the words a card and the sidebar's details list
 | already use.
 |
 | The static site labels the third of these "Restricted (Age: 18+)". This says
 | "Adults", which is what the CMS calls it and what every other place on the
 | site that names an age group says — one vocabulary rather than two, and the
 | age it would have quoted is not one an editor can set.
 |
 */
function age_groups_facet ( sessions: Session_Card[] ): Facet {
	const present = new Set( sessions.map( ( row ) => row.age_group ) )

	return {
		heading: "Age Groups",
		name: "age_groups",
		options: AGE_GROUPS
			.filter( ( age_group ) => present.has( age_group ) )
			.map( ( age_group: Age_Group ) => ( {
				label: age_group_label( age_group ) ?? age_group,
				value: age_group,
			} ) ),
	}
}

const ADMISSION_LABELS: Record<Admission, string> = {
	free: "Free Event",
	ticketed: "Ticketed Event",
}

function admissions_facet ( sessions: Session_Card[] ): Facet {
	const present = new Set(
		sessions.map( admission_of ).filter( Boolean ),
	)

	return {
		heading: "Event Types",
		name: "admissions",
		options: ADMISSIONS
			.filter( ( admission ) => present.has( admission ) )
			.map( ( admission ) => ( {
				label: ADMISSION_LABELS[admission],
				value: admission,
			} ) ),
	}
}

/**
 |
 | The four categories, on the schedule alone.
 |
 | "All Showcases" rather than "Showcases", because the option is what a
 | visitor is asking to be shown rather than a name for the group — and the
 | wording is the static site's own.
 |
 */
function categories_facet ( sessions: Session_Card[] ): Facet {
	const present = new Set( sessions.map( ( row ) => row.category ) )

	return {
		heading: "Event Categories",
		name: "categories",
		options: CATEGORIES
			.filter( ( category ) => present.has( category ) )
			.map( ( category ) => ( {
				category,
				label: `All ${category}s`,
				value: category,
			} ) ),
	}
}
