import type { Publication } from "./publication.js";

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

/**
 * Whether there is a publication here worth writing down.
 *
 * A record is two things: where the article went and when. Missing either one
 * does not make it a record with a gap in it — it makes it not a record, and
 * the vault gets a line that says nothing.
 *
 * It lives here because both sides need it and only one of them can be
 * trusted. The form uses it to decide whether Record may be pressed; the main
 * process uses it before writing, because a check that only runs in the window
 * is a check that any other way of recording would skip.
 */
export function recordable(
	publication: Pick<Publication, "url" | "publishedAt">,
	today: string,
): boolean {
	// A scheme and something after it. `startsWith("http")` also accepted the
	// word "http" and anything beginning with it.
	if (!/^https?:\/\/\S/.test(publication.url.trim())) return false;
	// Checked against today even though the field carries `max`: that attribute
	// governs the calendar and marks the field invalid, but a year typed
	// straight into it still arrives here. An article cannot have gone out
	// tomorrow, and `2062` is a slip nobody notices in a file they rarely open.
	return publication.publishedAt !== "" && publication.publishedAt <= today;
}
