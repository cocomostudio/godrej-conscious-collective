
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
 | The text a spreadsheet should show for one stored value of an attribute of
 | the given type.
 |
 */
export function cell_of (
	value: unknown,
	type: string,
	timezone: string,
): string {
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
			return guard_formula( JSON.stringify( value ) )
		// A number cannot run as a formula, and guarding one would turn a
		// negative number into text.
		case "integer":
		case "biginteger":
		case "float":
		case "decimal":
			return String( value )
	}

	return guard_formula( String( value ) )
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
