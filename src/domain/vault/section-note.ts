import { splitFrontmatter } from "./frontmatter.js";

export interface SectionNote {
	/** The note's own `# ` line, which is the text that gets published. */
	readonly heading: string | null;
	/** Everything below that heading. */
	readonly body: string;
}

const TOP_HEADING = /^ {0,3}#[ \t]+(.*)$/;

/**
 * Reads a section note: a single first-level heading, then the prose.
 *
 * Only a first-level heading is taken as the section's own. A note that opens
 * at `##` is one whose author meant it as content, and promoting it here would
 * quietly restructure the article.
 */
export function parseSectionNote(text: string): SectionNote {
	const { body } = splitFrontmatter(text);
	const lines = body.split("\n");

	let first = 0;
	while (first < lines.length && (lines[first] ?? "").trim().length === 0) first++;

	const heading = TOP_HEADING.exec(lines[first] ?? "");
	if (heading === null) return { heading: null, body: body.trim() };

	return {
		heading: (heading[1] ?? "").trim(),
		body: lines.slice(first + 1).join("\n").trim(),
	};
}
