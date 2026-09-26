
import { minute_in } from "./calendar"

/** Excel reads a file as UTF-8 only when it starts with this mark. */
export const BYTE_ORDER_MARK = "\uFEFF"

/** One CSV line: every cell quoted, and the line ended with CRLF. */
export function csv_line ( cells: string[] ): string {
	return cells.map( ( cell ) => `"${cell.replace( /"/g, "\"\"" )}"` )
		.join( "," ) + "\r\n"
}

/**
 |
 | The cell a spreadsheet should show for one stored value of an attribute of
 | the given type.
 |
 */
export function cell_of (
	value: unknown,
	type: string,
	timezone: string,
): string {
	const text = text_of( value, type, timezone )

	// A number cannot run as a formula, and guarding one would turn a
	// negative number into text.
	return NUMBER_TYPES.includes( type ) ? text : guard_formula( text )
}

/**
 |
 | One cell for several stored values, such as the entries of a relation to
 | many. The values are joined with `; `, and the formula guard looks at the
 | joined text, because only the start of a cell can run as a formula.
 |
 */
export function joined_cell (
	values: unknown[],
	type: string,
	timezone: string,
): string {
	if ( values.length === 1 ) {
		return cell_of( values[0], type, timezone )
	}

	return guard_formula(
		values.map( ( value ) => text_of( value, type, timezone ) )
			.filter( ( text ) => text !== "" )
			.join( "; " ),
	)
}

const NUMBER_TYPES = [ "integer", "biginteger", "float", "decimal" ]

function text_of ( value: unknown, type: string, timezone: string ): string {
	if ( value === null || value === undefined || value === "" ) {
		return ""
	}

	switch ( type ) {
		case "boolean":
			return value ? "TRUE" : "FALSE"
		case "datetime":
		case "timestamp":
			return minute_in( timezone, new Date( value as string ) )
		case "date":
			return value instanceof Date
				? value.toISOString().slice( 0, 10 )
				: String( value )
		case "json":
		case "blocks":
			return JSON.stringify( value )
	}

	return String( value )
}

/**
 |
 | Stops a cell running as a formula when the file is opened in a spreadsheet.
 |
 | A cell that starts with a character a spreadsheet reads as the start of a
 | formula gets a leading `'`. A cell made only of digits, spaces, `+`, `-`,
 | `(` and `)` is left alone, because it cannot call a function, and guarding
 | it would spoil every phone number written as `+91 98765 43210`.
 |
 */
function guard_formula ( text: string ): string {
	if ( !FORMULA_START.test( text ) || PHONE_LIKE.test( text ) ) {
		return text
	}

	return `'${text}`
}

const FORMULA_START = /^[=+\-@\t\r]/
const PHONE_LIKE = /^[0-9 +\-()]+$/
