import { splitFrontmatter } from "../vault/frontmatter.js";

/**
 * The author's own words for announcing an article somewhere.
 *
 * Written, not generated. A summary produced from the article reads like a
 * summary produced from the article, and the point of a message to Reddit or a
 * tip to Hackaday is that a person wrote it for that audience. Pressroom
 * carries it; it does not compose it.
 *
 * Kept beside the article in the vault — `<article>/announcements/<platform>.md`
 * — for the same reason the publication record is: it belongs with the text,
 * is versioned with it, and is written where the author already writes.
 */
export interface Announcement {
	/** An alternative to the article's own title, where one is wanted. */
	readonly title: string | null;
	readonly body: string;
}

/**
 * Reads an announcement note: an optional title in the frontmatter, and the
 * prose beneath it.
 *
 * A note that is only a title is still an announcement — Hacker News takes
 * nothing but a title and a link — and a note that is only prose is one too.
 */
export function parseAnnouncement(note: string): Announcement {
	const { fields, body } = splitFrontmatter(note);
	const title = fields.get("title")?.trim();
	return {
		title: title === undefined || title.length === 0 ? null : title,
		body: body.trim(),
	};
}
