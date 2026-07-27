/**
 * Whether there is a publication here worth writing down.
 *
 * A record is two things: where the article went and when. Missing either one
 * does not make it a record with a gap in it — it makes it not a record, and
 * the vault gets a line that says nothing. So the form waits.
 *
 * The date is checked against today even though the field carries `max`:
 * that attribute governs the calendar and marks the field invalid, but a year
 * typed straight into it still arrives here. An article cannot have gone out
 * tomorrow, and `2062` is a slip nobody notices in a file they rarely open.
 */
export function recordable(url: string, publishedAt: string, today: string): boolean {
	// A scheme and something after it. `startsWith("http")` also accepted the
	// word "http" and anything beginning with it.
	return /^https?:\/\/\S/.test(url.trim()) && publishedAt !== "" && publishedAt <= today;
}
