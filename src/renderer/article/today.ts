/**
 * The day, where the person recording it is.
 *
 * Not `toISOString().slice(0, 10)`, which is the day in UTC: past midnight
 * local time that is still yesterday, and an article would be recorded as
 * published the day before it was. The record is read by a person about their
 * own work, so it holds their date.
 */
export function localDate(at: Date): string {
	const month = `${at.getMonth() + 1}`.padStart(2, "0");
	const day = `${at.getDate()}`.padStart(2, "0");
	return `${at.getFullYear()}-${month}-${day}`;
}
