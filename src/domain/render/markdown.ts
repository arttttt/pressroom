import type { ArticleDocument } from "../../shared/article.js";

/**
 * A fenced block opener: three or more backticks or tildes, indented no more
 * than three spaces. What follows on the line is the info string.
 */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX_HEADING = /^( {0,3})(#{1,6})([ \t]|$)/;
const DEEPEST_LEVEL = 6;

/** A document's own text, before any platform has had a say in it. */
export interface PlainDocument {
	readonly title: string;
	readonly body: string;
}

/**
 * Applies a change to every line except those inside a fenced block.
 *
 * Every transform here has the same reason to know about fences: `# ` opens a
 * comment in the shell snippets these articles are full of, and rewriting one
 * as a heading corrupts the command. Fences are matched as Markdown defines
 * them, so a shorter run cannot close a longer one.
 */
function outsideFences(markdown: string, change: (line: string) => string): string {
	let openedWith: string | null = null;

	return markdown
		.split("\n")
		.map((line) => {
			const fence = FENCE.exec(line);
			if (fence !== null) {
				const marker = fence[1] ?? "";
				if (openedWith === null) {
					// An info string may not contain a backtick, so a line like
					// ```js opens a block; ``` inside one can only ever close it.
					openedWith = marker;
				} else if (
					marker[0] === openedWith[0] &&
					marker.length >= openedWith.length &&
					(fence[2] ?? "").trim().length === 0
				) {
					openedWith = null;
				}
				return line;
			}

			return openedWith === null ? change(line) : line;
		})
		.join("\n");
}

/**
 * Pushes every heading one level down.
 *
 * Section notes are written standalone, so their own heading is `#` and any
 * heading inside them starts at `##`. Assembled into one article those move
 * down a level.
 */
export function demoteHeadings(markdown: string): string {
	return outsideFences(markdown, (line) => {
		const heading = ATX_HEADING.exec(line);
		if (heading === null) return line;
		const hashes = heading[2] ?? "";
		if (hashes.length >= DEEPEST_LEVEL) return line;
		return `${heading[1] ?? ""}#${line.trimStart()}`;
	});
}

/**
 * Lifts anything deeper than a platform allows up to its deepest level.
 *
 * Habr stops at the third; a heading below that is not rendered small, it is
 * not rendered as a heading at all. Flattening is the lesser loss — the text
 * keeps its emphasis, and only the distinction between two depths goes.
 */
export function capHeadings(markdown: string, deepest: number): string {
	return outsideFences(markdown, (line) => {
		const heading = ATX_HEADING.exec(line);
		if (heading === null) return line;
		const hashes = heading[2] ?? "";
		if (hashes.length <= deepest) return line;
		return `${heading[1] ?? ""}${"#".repeat(deepest)}${line.trimStart().slice(hashes.length)}`;
	});
}

/**
 * Joins a document's sections into one piece of plain Markdown.
 *
 * The title is kept out of the body: every target has its own title field, and
 * repeating it as a heading duplicates it on the published page. Section
 * headings therefore become the document's top level, at `##`.
 *
 * This is the base every platform renderer works from — each starts here and
 * adjusts, so what they share lives in one place rather than being written out
 * five times.
 */
export function assembleMarkdown(doc: ArticleDocument): PlainDocument {
	const body = doc.sections
		.map((section) => {
			const prose = demoteHeadings(section.body).trim();
			const heading = `## ${section.heading}`;
			return prose.length === 0 ? heading : `${heading}\n\n${prose}`;
		})
		.join("\n\n");

	return { title: doc.title, body };
}
