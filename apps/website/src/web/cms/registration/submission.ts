
/**
 |
 | The registration form's **shape**, its **rules**, and the one schema both
 | sides parse against.
 |
 | Lifted from the static site, where the same file declared each field once —
 | its name, its id, its label, its autofill hint and what makes it invalid —
 | and the markup was generated from that. Two things are added in the lift:
 |
 |   • The submission now goes somewhere, so there is a **valibot schema** as
 |     well as the browser's per-field messages. It is the same schema on both
 |     sides: the browser stops a visitor sending something the server would
 |     refuse, and the server refuses it anyway, because the browser is not a
 |     party the server can take advice from.
 |
 |   • The consent sentences are **strings here**, not JSX in the form. They
 |     are the wording that gets stored against the record, and a sentence that
 |     exists twice — once to render and once to store — is a sentence that
 |     will eventually disagree with itself. The form splices the Privacy
 |     Notice link into the one copy at render time.
 |
 | ─── WHY VALIDATION STILL READS THE <form> ──────────────────────────────────
 |
 | The per-field messages below are collected from the form ELEMENTS, not from
 | a values object, and that is unchanged from the static site. The form is
 | uncontrolled and it REMOUNTS when the viewport crosses the medium
 | breakpoint, so the DOM is the one copy of the answers that is always
 | current — the mirror in `values_ref` is a restoration aid, a frame behind by
 | definition, and after a remount it is repopulated FROM the DOM's
 | `defaultValue`s anyway.
 |
 | `validity.typeMismatch` on the email field is the browser's implementation
 | of the HTML spec's "valid e-mail address" production, so there is no email
 | regex here. Everything else is plain code that never consults it. One rule
 | about how: read `validity`, never call `checkValidity()` — the method
 | dispatches an `invalid` event at every control it touches, and this runs on
 | every keystroke.
 |
 | NO COMPONENTS IN THIS FILE, deliberately: it is imported by the form, by the
 | fields, and by the server's relay, and a module exporting a component would
 | drag JSX into the last of those.
 |
 */

import * as v from "valibot"

export type Text_Field_Spec = {
	name: string
	id: string
	label: string
	type: "text" | "email" | "tel"
	autocomplete: string
	/** Shown when the field is blank, or holds nothing but whitespace. */
	missing_message: string
	/** Runs only once there is something to judge. `null` means "fine". */
	check?: ( value: string, validity: ValidityState ) => string | null
}

/*
 | A dot somewhere in the DOMAIN, followed immediately by at least one letter.
 |
 | The gap the platform leaves and this closes: the HTML spec's definition of a
 | valid email address allows a bare hostname, so `ada@example` and `a@b` both
 | satisfy `validity.typeMismatch` while being almost certainly a slip in a
 | registration form. Numeric labels are legal too, which is why the letter
 | matters — `ada@example.123` clears the spec and does not clear this.
 |
 | Deliberately not anchored to the LAST dot: `ada@mail.example.co.uk` has
 | several, and any one of them satisfying this is enough.
 */
const A_DOTTED_DOMAIN = /\.[a-zA-Z]/

// Deliberately generous: this has to accept "+91 98765 43210", "(022) 2518
// 8010" and "9876543210" alike. The digit COUNT does the real work.
const PERMITTED_IN_A_PHONE_NUMBER = /^[+\-() 0-9]+$/
const A_DIGIT = /[0-9]/g

// E.164 puts the ceiling at 15 digits including the country code. The floor is
// a judgement call: 8 admits every national number we are likely to see while
// still rejecting an obvious slip.
const FEWEST_DIGITS_IN_A_PHONE_NUMBER = 8
const MOST_DIGITS_IN_A_PHONE_NUMBER = 15

/**
 |
 | Every string is capped, and the caps are the schema's rather than the
 | browser's. A `maxLength` attribute is a courtesy to somebody typing; this is
 | what stops a script posting a megabyte into a text column.
 |
 | Each number matches the `maxLength` on the CMS's own attribute, so a value
 | this accepts is one the CMS can store. The two are deliberately equal rather
 | than one being generous: a body that passes here and fails there would fail
 | as a 500 after the relay had already accepted it.
 |
 */
const LONGEST = {
	email_address: 320,
	institution: 200,
	name: 120,
	phone_number: 40,
}
// ↑ `occupation` and `interests` are not here, and should not be. Both are
// 	`picklist`s of values this form issued, so their bound is the set of legal
// 	answers rather than a length — a cap on them would be a second, weaker rule
// 	standing in front of an exact one.

export const TEXT_FIELDS: Text_Field_Spec[] = [
	{
		autocomplete: "given-name",
		id: "registration-first-name",
		label: "First Name",
		missing_message: "Please enter your first name.",
		name: "first_name",
		type: "text",
	},
	{
		autocomplete: "family-name",
		id: "registration-last-name",
		label: "Last Name",
		missing_message: "Please enter your last name.",
		name: "last_name",
		type: "text",
	},
	{
		autocomplete: "email",
		check: ( value, validity ) => {
			const invalid_message = "Please enter a valid email address."

			if ( validity.typeMismatch ) {
				return invalid_message
			}

			// Everything after the last `@` is the domain. Safe to assume by
			// this point: `typeMismatch` has already established there is
			// exactly one `@`, because the spec's local part cannot contain
			// another.
			const domain = value.slice( value.lastIndexOf( "@" ) + 1 )

			return A_DOTTED_DOMAIN.test( domain ) ? null : invalid_message
		},
		id: "registration-email",
		label: "Email",
		missing_message: "Please enter your email address.",
		name: "email",
		type: "email",
	},
	{
		autocomplete: "tel",
		check: ( value ) => {
			if ( !PERMITTED_IN_A_PHONE_NUMBER.test( value ) ) {
				return "Please use only digits, spaces, and the characters + - ( )."
			}

			const invalid_message = "Please enter a valid mobile number."
			const digits = value.match( A_DIGIT )?.length ?? 0

			if ( digits < FEWEST_DIGITS_IN_A_PHONE_NUMBER ) {
				return invalid_message
			}

			if ( digits > MOST_DIGITS_IN_A_PHONE_NUMBER ) {
				return invalid_message
			}

			return null
		},
		id: "registration-mobile",
		label: "Mobile",
		missing_message: "Please enter your mobile number.",
		name: "mobile",
		type: "tel",
	},
	{
		autocomplete: "organization",
		id: "registration-company-or-school",
		label: "Company / School",
		missing_message: "Please enter your company or school.",
		name: "company_or_school",
		type: "text",
	},
]

export const OCCUPATION = {
	id: "registration-occupation",
	label: "Occupation",
	missing_message: "Please select your occupation.",
	name: "occupation",

	// The empty option. It is `disabled` in the markup, so it can be left but
	// not returned to — the field is required, and offering a way back to
	// "unanswered" is offering a way to be wrong.
	placeholder: "Select an option",

	// Values are slugs rather than the labels, so the wording can be revised
	// without invalidating anything already submitted.
	options: [
		{ label: "Practicing Architect", value: "practicing-architect" },
		{
			label: "Practicing Interior Designer",
			value: "practicing-interior-designer",
		},
		{
			label: "Practicing Product Designer",
			value: "practicing-product-designer",
		},
		{ label: "Student Architect", value: "student-architect" },
		{
			label: "Student Interior Designer",
			value: "student-interior-designer",
		},
		{
			label: "Student Product Designer",
			value: "student-product-designer",
		},
		{ label: "Other", value: "other" },
	],
}

export const INTERESTS = {
	legend: "Interested in",
	missing_message: "Please choose at least one.",
	name: "interests",

	// The site's four programme strands — the same four the schedule page
	// filters by, and the same four the context colours are named after.
	options: [
		{
			id: "registration-interest-showcases",
			label: "Showcases",
			value: "showcases",
		},
		{
			id: "registration-interest-experiences",
			label: "Experiences",
			value: "experiences",
		},
		{
			id: "registration-interest-conversations",
			label: "Conversations",
			value: "conversations",
		},
		{
			id: "registration-interest-workshops",
			label: "Workshops",
			value: "workshops",
		},
	],
} as const

export type Consent_Spec = {
	name: string
	id: string
	value: string
	missing_message: string
	/**
	 |
	 | The sentence beside the box, and **the sentence that gets stored**. One
	 | copy, because the record has to be able to say what was on screen and a
	 | second copy would eventually say something else.
	 |
	 */
	text: string
	/**
	 |
	 | A phrase inside `text` to render as a link, and where it goes. The form
	 | splits the sentence around it. Absent on a sentence with no link in it.
	 |
	 */
	link?: { phrase: string; url: string }
}

/**
 |
 | The two consents, **each named**, and the ordered list for rendering.
 |
 | Named rather than reached for by index, and this one is not style. Every site
 | that reads a consent — the checkbox it draws, the message it shows, the key
 | it puts in the submitted body — used to say `CONSENTS[ 0 ]` and
 | `CONSENTS[ 1 ]`, which means reordering this array would silently record the
 | privacy consent under the accuracy declaration's name and the other way
 | round. Nothing would fail; the records would simply start saying the wrong
 | thing about what somebody agreed to, which is the one class of bug this
 | content type exists to prevent.
 |
 | `CONSENTS` survives because the ORDER is real — it is the order they appear
 | in — but nothing reads a particular one out of it.
 |
 */
export const PRIVACY_CONSENT: Consent_Spec = {
	id: "registration-privacy-consent",
	link: { phrase: "Privacy Notice", url: "/privacy-policy" },
	missing_message: "Please give your consent before submitting.",
	name: "privacy_consent",
	text: "I have read the Privacy Notice and hereby provide my consent to "
		+ "process the information for the purposes defined in the notice.",
	value: "yes",
}

export const ACCURACY_DECLARATION: Consent_Spec = {
	id: "registration-accuracy-declaration",
	missing_message: "Please confirm that your information is accurate.",
	name: "accuracy_declaration",
	text: "I hereby declare that the information provided by me is accurate.",
	value: "yes",
}

/** Top to bottom, as rendered. The wording is joined from this, in this order. */
export const CONSENTS: Consent_Spec[] = [
	PRIVACY_CONSENT,
	ACCURACY_DECLARATION,
]

/**
 |
 | The exact wording a visitor agreed to, as one string.
 |
 | **This is what the server stamps onto the record**, and it is derived from
 | the same sentences the form renders rather than written out beside them. The
 | wording will change; a record that cannot say which version it agreed to is
 | not a record, and two copies of the sentence is how a record comes to say
 | the wrong one.
 |
 */
export function consent_wording () {
	return CONSENTS.map( ( consent ) => consent.text ).join( " " )
}

/*
 | Checkboxes SHARE a name — that is how a group submits — so a name alone
 | cannot identify one. The pair that can is (name, value), which is exactly
 | what the DOM submits, and this is the key the draft's `checked_ref` uses.
 | Deliberately not the element id: ids exist to wire up `htmlFor` and
 | `aria-describedby`, and renaming one should not silently drop a draft.
 */
export function checkbox_key ( name: string, value: string ) {
	return `${name}:${value}`
}

/** Top to bottom, as rendered. Drives "focus the first field with a problem". */
export const FIELD_ORDER = [
	...TEXT_FIELDS.map( ( field ) => field.name ),
	OCCUPATION.name,
	INTERESTS.name,
	...CONSENTS.map( ( consent ) => consent.name ),
]

/* _____
 | The schema the body is parsed against, on the server.
 |
 | `strictObject` rather than `object`: **an unknown field is a rejection, not
 | something to ignore.** A body carrying an attribute this form never had is a
 | caller trying something, and answering "no" is cheaper and more honest than
 | quietly dropping it and storing the rest.
 |
 | The browser's own copy of these rules is the per-field messages above, and
 | they are deliberately not generated from this: the messages are written for
 | somebody filling a form in and say what to do about it, and this says
 | whether a body is acceptable. One schema serving both would mean either
 | error text in the server's vocabulary or a server that accepted things
 | because the wording was awkward.
 |
 | The honeypot's field name is not here. It is decided per mint and travels in
 | the signed token, so the relay strips it from the body before parsing — see
 | `submit.route.ts`.
 */

const trimmed_string = ( longest: number ) =>
	v.pipe(
		v.string(),
		v.trim(),
		v.minLength( 1 ),
		v.maxLength( longest ),
	)

export const SUBMISSION_SCHEMA = v.strictObject( {
	form_token: v.pipe( v.string(), v.minLength( 1 ), v.maxLength( 512 ) ),

	first_name: trimmed_string( LONGEST.name ),
	last_name: trimmed_string( LONGEST.name ),
	email: v.pipe(
		trimmed_string( LONGEST.email_address ),
		v.email(),
		// The same rule the browser's `check` applies with `A_DOTTED_DOMAIN`,
		// written whole-string because there is no `ValidityState` here to
		// have established where the domain starts: a dot and a letter
		// somewhere AFTER the `@`, so `ada@example` and `ada@example.123` are
		// refused and `ada@mail.example.co.uk` is not.
		v.regex( /@[^@]*\.[a-zA-Z]/ ),
	),
	mobile: v.pipe(
		trimmed_string( LONGEST.phone_number ),
		v.regex( PERMITTED_IN_A_PHONE_NUMBER ),
		v.check(
			( value ) => {
				const digits = value.match( A_DIGIT )?.length ?? 0
				return digits >= FEWEST_DIGITS_IN_A_PHONE_NUMBER
					&& digits <= MOST_DIGITS_IN_A_PHONE_NUMBER
			},
			"A mobile number carries between 8 and 15 digits.",
		),
	),
	company_or_school: trimmed_string( LONGEST.institution ),

	// `picklist`, not a capped string: the values are slugs this form issued,
	// so anything else is not a typo, it is somebody else's body.
	occupation: v.picklist(
		OCCUPATION.options.map( ( option ) => option.value ),
	),

	interests: v.pipe(
		v.array(
			v.picklist( INTERESTS.options.map( ( option ) => option.value ) ),
		),
		v.minLength( 1 ),
		v.maxLength( INTERESTS.options.length ),
	),

	// `literal( true )` rather than `boolean()`: false is not a submission with
	// consent withheld, it is a submission that must not be recorded, and the
	// place to say so is the schema.
	privacy_consent: v.literal( true ),
	accuracy_declaration: v.literal( true ),
} )

export type Submission = v.InferOutput<typeof SUBMISSION_SCHEMA>

/* _____
 | The browser's half: every problem the form currently has, keyed by field
 | name.
 |
 | The WHOLE truth, with no view taken on which of them the visitor has earned
 | the right to see yet. That judgement (has Submit been pressed?) belongs to
 | the form, and is made there. An empty object means the form is ready.
 */

function checkboxes_named ( form: HTMLFormElement, name: string ) {
	// `form.elements.namedItem()` hands back a bare element for a group of one
	// and a RadioNodeList for a group of many, which would need unpicking at
	// every call site. A selector always returns a list.
	return Array.from(
		form.querySelectorAll<HTMLInputElement>( `input[name="${name}"]` ),
	)
}

export function collect_messages (
	form: HTMLFormElement,
): Record<string, string> {
	const messages: Record<string, string> = {}

	for ( const field of TEXT_FIELDS ) {
		const control = form.elements.namedItem( field.name )

		if ( !( control instanceof HTMLInputElement ) ) {
			continue
		}

		// Trimmed, so a field holding one space reads as empty. `required`
		// alone would have accepted it.
		const value = control.value.trim()

		if ( value === "" ) {
			messages[field.name] = field.missing_message
			continue
		}

		const problem = field.check?.( value, control.validity )

		if ( problem ) {
			messages[field.name] = problem
		}
	}

	const occupation = form.elements.namedItem( OCCUPATION.name )

	if ( occupation instanceof HTMLSelectElement && occupation.value === "" ) {
		messages[OCCUPATION.name] = OCCUPATION.missing_message
	}

	// "At least one of these" is the one rule the platform cannot state:
	// `required` on a checkbox means THAT checkbox, unlike a radio group.
	const chosen = checkboxes_named( form, INTERESTS.name )
		.filter( ( box ) => box.checked )

	if ( chosen.length === 0 ) {
		messages[INTERESTS.name] = INTERESTS.missing_message
	}

	for ( const consent of CONSENTS ) {
		const control = form.elements.namedItem( consent.name )

		if ( control instanceof HTMLInputElement && !control.checked ) {
			messages[consent.name] = consent.missing_message
		}
	}

	return messages
}

/** Shallow equality, so the form can decline to re-render when nothing moved. */
export function messages_match (
	left: Record<string, string>,
	right: Record<string, string>,
) {
	const names = Object.keys( left )

	if ( names.length !== Object.keys( right ).length ) {
		return false
	}

	return names.every( ( name ) => left[name] === right[name] )
}
